/**
 * The ingest pipeline: YouTube catalog + CFBD roster → the Drizzle store.
 *
 *   npx tsx scripts/ingest.ts
 *
 * Inputs (all local files, so runs are reproducible and offline):
 *   catalog-analysis.json   scripts/catalog-analysis.ts (YouTube API dump)
 *   roster-cfbd.json        scripts/fetch-roster.ts (CFBD roster cache)
 *
 * The pipeline is IDEMPOTENT and safe over editorial work:
 *   - video/player upserts touch synced columns only (lib/db/sync.ts)
 *   - tag links it writes carry source='auto'; re-runs replace auto rows and
 *     never touch 'manual' ones
 *   - a video with reviewedAt set is human-owned: content still syncs, but
 *     tags and publish state are left alone
 *
 * Publish policy (from the AUTO-TAGGING CONTRACT in lib/schema):
 *   confidence  = min score of kept player links; if no player links but
 *                 other tags matched, CONCEPT_ONLY_CONFIDENCE (regex tags are
 *                 deliberately specific); else 0
 *   outcome     = tagOutcome(confidence, hasAnyTag)
 *   published   = outcome !== 'needs-review', EXCEPT unknown-duration videos
 *                 (durationSec <= 0), which always go to the review queue
 *   "unmatched" videos publish as plain content — no tags means nothing to
 *   be wrong about.
 */
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { closeDb, getDb, type Db } from "../lib/db/client";
import { mintSlug } from "../lib/db/slug";
import {
  concepts,
  players,
  series,
  videoConcepts,
  videoPlayers,
  videoPositionOverrides,
  videos,
  videoTopics,
} from "../lib/db/schema";
import {
  upsertConceptFromLexicon,
  upsertPlayerFromCfbd,
  upsertSeriesSeed,
  upsertVideoFromYouTube,
} from "../lib/db/sync";
import {
  hasUnknownDuration,
  normalizePosition,
  tagDestination,
  tagOutcome,
  YouTubeIdSchema,
  type PlayerStatus,
} from "../lib/schema";
import { findBoilerplateLines, LEXICON, stripBoilerplate } from "../lib/ingest/lexicon";
import { buildMatcher, type RosterPlayer } from "../lib/ingest/matcher";
import { buildTagger } from "../lib/ingest/tagger";
import { RosterCacheSchema, ROSTER_CACHE_FILE } from "./fetch-roster";

const CATALOG_FILE = "catalog-analysis.json";

/** Confidence for videos whose only tags are closed-vocabulary regex hits. */
const CONCEPT_ONLY_CONFIDENCE = 90;

/**
 * Verified series in the catalog; counts at time of design in lib/schema.
 * ORDER IS PRECEDENCE: two titles match both "film work" and "hazebringer"
 * ("Film Work: Buck Sweep-HazeBringer Short") — series is single-valued, and
 * the leading "Film Work:" names the series; "HazeBringer Short" there is a
 * format suffix.
 */
const SERIES_SEEDS = [
  { slug: "film-work", name: "Film Work", titlePattern: "film work", active: true },
  { slug: "hazebringer", name: "HazeBringer", titlePattern: "hazebringer", active: false },
  { slug: "head-on-a-swivel", name: "Head On A Swivel", titlePattern: "head on a swivel", active: true },
  { slug: "dawg-dispatch", name: "Dawg Dispatch", titlePattern: "dawg dispatch", active: true },
];

const CatalogVideoSchema = z.object({
  videoId: YouTubeIdSchema,
  title: z.string().min(1),
  description: z.string().default(""),
  publishedAt: z.string().datetime(),
  durationSec: z.number().int().nonnegative(),
  views: z.number().int().nonnegative().default(0),
});
type CatalogVideo = z.infer<typeof CatalogVideoSchema>;


// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------
async function seedSeries(db: Db): Promise<Array<{ id: number; pattern: string }>> {
  const out: Array<{ id: number; pattern: string }> = [];
  for (const s of SERIES_SEEDS) {
    const { id } = await upsertSeriesSeed(db, s);
    out.push({ id, pattern: s.titlePattern.toLowerCase() });
  }
  return out;
}

async function seedConcepts(db: Db): Promise<number> {
  let n = 0;
  for (const entry of LEXICON) {
    if (tagDestination(entry.family) !== "concept") continue;
    // tagDestination narrowed family to the scheme families = ConceptFamily.
    await upsertConceptFromLexicon(db, {
      slug: entry.slug,
      label: entry.label,
      family: entry.family as (typeof concepts.$inferInsert)["family"],
      matchPatterns: [entry.rx.source],
    });
    n++;
  }
  return n;
}

async function seedPlayers(
  db: Db,
): Promise<{ seeded: number; skipped: string[] } | null> {
  if (!existsSync(ROSTER_CACHE_FILE)) return null;
  const cache = RosterCacheSchema.parse(
    JSON.parse(await readFile(ROSTER_CACHE_FILE, "utf8")),
  );
  const latestSeason = Math.max(...cache.seasons);

  const existing = await db
    .select({ slug: players.slug, cfbdId: players.cfbdId })
    .from(players);
  const takenSlugs = new Set(existing.map((p) => p.slug));
  const known = new Set(existing.map((p) => p.cfbdId).filter(Boolean));

  let seeded = 0;
  const skipped: string[] = [];
  for (const p of cache.players) {
    const position = normalizePosition(p.cfbdPosition);
    if (!position) {
      // Flag rather than silently mis-bucket (see CFBD_POSITION_MAP).
      skipped.push(`${p.name} (${p.cfbdPosition ?? "no position"})`);
      continue;
    }
    const status: PlayerStatus = p.rosterYears.includes(latestSeason)
      ? "active"
      : "graduated"; // seed value; departed players need an editorial pass
    await upsertPlayerFromCfbd(db, {
      cfbdId: p.cfbdId,
      slug: known.has(p.cfbdId)
        ? (existing.find((e) => e.cfbdId === p.cfbdId)?.slug ??
          mintSlug(p.name, `player-${p.cfbdId}`, takenSlugs))
        : mintSlug(p.name, `player-${p.cfbdId}`, takenSlugs),
      name: p.name,
      position,
      heightIn: p.heightIn,
      weightLb: p.weightLb,
      city: p.city,
      state: p.state,
      rosterYears: [...p.rosterYears].sort(),
      status,
    });
    seeded++;
  }
  return { seeded, skipped };
}

// ---------------------------------------------------------------------------
// Tag-link replacement: wipe this video's 'auto' rows, insert fresh ones.
// 'manual' rows are never selected by the delete and win pk conflicts.
// ---------------------------------------------------------------------------
async function replaceAutoLinks(
  db: Db,
  videoId: number,
  links: {
    players: Array<{ playerId: number; score: number }>;
    conceptIds: number[];
    topics: string[];
    positionGroups: string[];
  },
): Promise<void> {
  await db
    .delete(videoPlayers)
    .where(and(eq(videoPlayers.videoId, videoId), eq(videoPlayers.source, "auto")));
  await db
    .delete(videoConcepts)
    .where(and(eq(videoConcepts.videoId, videoId), eq(videoConcepts.source, "auto")));
  await db
    .delete(videoTopics)
    .where(and(eq(videoTopics.videoId, videoId), eq(videoTopics.source, "auto")));
  await db
    .delete(videoPositionOverrides)
    .where(
      and(
        eq(videoPositionOverrides.videoId, videoId),
        eq(videoPositionOverrides.source, "auto"),
      ),
    );

  if (links.players.length)
    await db
      .insert(videoPlayers)
      .values(
        links.players.map((m) => ({
          videoId,
          playerId: m.playerId,
          source: "auto" as const,
          matchScore: m.score,
        })),
      )
      .onConflictDoNothing();
  if (links.conceptIds.length)
    await db
      .insert(videoConcepts)
      .values(links.conceptIds.map((conceptId) => ({ videoId, conceptId })))
      .onConflictDoNothing();
  if (links.topics.length)
    await db
      .insert(videoTopics)
      .values(
        links.topics.map((topic) => ({
          videoId,
          topic: topic as (typeof videoTopics.$inferInsert)["topic"],
        })),
      )
      .onConflictDoNothing();
  if (links.positionGroups.length)
    await db
      .insert(videoPositionOverrides)
      .values(
        links.positionGroups.map((g) => ({
          videoId,
          positionGroup:
            g as (typeof videoPositionOverrides.$inferInsert)["positionGroup"],
        })),
      )
      .onConflictDoNothing();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!existsSync(CATALOG_FILE)) {
    console.error(
      `${CATALOG_FILE} not found. Run:\n  npx tsx --env-file=.env scripts/catalog-analysis.ts`,
    );
    process.exit(1);
  }

  const db = getDb();
  await migrate(db, { migrationsFolder: "drizzle" });

  // ---- inputs -------------------------------------------------------------
  const rawCatalog = JSON.parse(await readFile(CATALOG_FILE, "utf8"));
  const catalog: CatalogVideo[] = z
    .array(CatalogVideoSchema)
    .parse(rawCatalog.videos);
  console.log(`catalog: ${catalog.length} videos`);

  // ---- seeds --------------------------------------------------------------
  const seriesSeeds = await seedSeries(db);
  const conceptCount = await seedConcepts(db);
  console.log(`seeded ${seriesSeeds.length} series, ${conceptCount} concepts`);

  const rosterResult = await seedPlayers(db);
  if (rosterResult) {
    console.log(`seeded ${rosterResult.seeded} players from ${ROSTER_CACHE_FILE}`);
    if (rosterResult.skipped.length) {
      console.warn(`⚠ skipped ${rosterResult.skipped.length} (unmapped position):`);
      for (const s of rosterResult.skipped) console.warn(`   ${s}`);
    }
  } else {
    console.warn(
      `⚠ ${ROSTER_CACHE_FILE} not found — player matching SKIPPED.\n` +
        `  Run: npx tsx --env-file=.env scripts/fetch-roster.ts`,
    );
  }

  // ---- build matchers -----------------------------------------------------
  const conceptRows = await db
    .select({ id: concepts.id, slug: concepts.slug, matchPatterns: concepts.matchPatterns })
    .from(concepts);
  const tagger = buildTagger(conceptRows);

  const rosterPlayers: RosterPlayer[] = (
    await db
      .select({ playerId: players.id, name: players.name, aliases: players.aliases })
      .from(players)
  ).map((p) => ({ ...p, aliases: p.aliases ?? [] }));
  const matcher = rosterPlayers.length ? buildMatcher(rosterPlayers) : null;

  const boilerplate = findBoilerplateLines(catalog.map((v) => v.description));
  console.log(`boilerplate: ${boilerplate.size} template lines stripped for tagging`);

  // ---- videos -------------------------------------------------------------
  const existing = await db
    .select({
      id: videos.id,
      youtubeId: videos.youtubeId,
      slug: videos.slug,
      reviewedAt: videos.reviewedAt,
    })
    .from(videos);
  const existingByYt = new Map(existing.map((v) => [v.youtubeId, v]));
  const takenSlugs = new Set(existing.map((v) => v.slug));

  const stats = {
    created: 0,
    updated: 0,
    reviewedSkipped: 0,
    published: 0,
    needsReview: 0,
    unmatched: 0,
    unknownDuration: 0,
    playerLinks: 0,
    conceptLinks: 0,
    topicLinks: 0,
    groupOverrides: 0,
  };

  for (const v of catalog) {
    const prior = existingByYt.get(v.videoId);
    const slug =
      prior?.slug ??
      mintSlug(v.title, `video-${v.videoId.toLowerCase()}`, takenSlugs);

    const { id } = await upsertVideoFromYouTube(db, {
      youtubeId: v.videoId,
      slug,
      title: v.title,
      description: v.description,
      publishedAt: v.publishedAt,
      durationSec: v.durationSec,
      views: v.views,
    });
    if (prior) stats.updated++;
    else stats.created++;

    // Human-reviewed videos: content synced above, tags/publish are theirs.
    if (prior?.reviewedAt) {
      stats.reviewedSkipped++;
      continue;
    }

    const tagInput = {
      title: v.title,
      strippedDescription: stripBoilerplate(v.description, boilerplate),
    };
    const tags = tagger(tagInput);
    const matches =
      matcher?.({ title: tagInput.title, description: tagInput.strippedDescription }) ??
      [];

    await replaceAutoLinks(db, id, {
      players: matches,
      conceptIds: tags.conceptIds,
      topics: tags.topics,
      positionGroups: tags.positionGroups,
    });
    stats.playerLinks += matches.length;
    stats.conceptLinks += tags.conceptIds.length;
    stats.topicLinks += tags.topics.length;
    stats.groupOverrides += tags.positionGroups.length;

    const hasAnyTag =
      matches.length > 0 ||
      tags.conceptIds.length > 0 ||
      tags.topics.length > 0 ||
      tags.positionGroups.length > 0;
    const confidence = matches.length
      ? Math.min(...matches.map((m) => m.score))
      : hasAnyTag
        ? CONCEPT_ONLY_CONFIDENCE
        : 0;
    const outcome = tagOutcome(confidence, hasAnyTag);

    const unknownDuration = hasUnknownDuration(v.durationSec);
    if (unknownDuration) stats.unknownDuration++;
    const published = !unknownDuration && outcome !== "needs-review";

    if (outcome === "needs-review" || unknownDuration) stats.needsReview++;
    else if (outcome === "unmatched") stats.unmatched++;
    if (published) stats.published++;

    await db
      .update(videos)
      .set({ autoTagged: true, tagConfidence: confidence, published })
      .where(eq(videos.id, id));
  }

  // ---- series assignment (title substring; reviewed videos are theirs) ----
  // Reverse order so the FIRST matching seed wins overlaps (last write).
  for (const s of [...seriesSeeds].reverse()) {
    await db
      .update(videos)
      .set({ seriesId: s.id })
      .where(
        and(
          sql`lower(${videos.title}) like ${"%" + s.pattern + "%"}`,
          isNull(videos.reviewedAt),
        ),
      );
  }

  // ---- summary ------------------------------------------------------------
  const seriesCounts = await db
    .select({ name: series.name, n: sql<number>`count(${videos.id})` })
    .from(series)
    .leftJoin(videos, eq(videos.seriesId, series.id))
    .groupBy(series.id);
  const linkedPlayers = await db
    .select({ n: sql<number>`count(distinct ${videoPlayers.playerId})` })
    .from(videoPlayers);
  const totalPlayers = await db
    .select({ n: sql<number>`count(*)` })
    .from(players);

  console.log("\n──── ingest summary ────");
  console.log(
    `videos    ${stats.created} created · ${stats.updated} re-synced · ${stats.reviewedSkipped} human-owned (tags untouched)`,
  );
  console.log(
    `publish   ${stats.published} published · ${stats.needsReview} in review queue (${stats.unknownDuration} unknown duration) · ${stats.unmatched} published untagged`,
  );
  console.log(
    `links     ${stats.playerLinks} player · ${stats.conceptLinks} concept · ${stats.topicLinks} topic · ${stats.groupOverrides} position-group overrides`,
  );
  for (const s of seriesCounts) console.log(`series    ${s.name}: ${s.n}`);
  console.log(
    `players   ${linkedPlayers[0].n}/${totalPlayers[0].n} linked to ≥1 video (only these get pages)`,
  );

  await closeDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
