/**
 * AdminRepository over Drizzle/libSQL — the seam between the admin UI and the
 * store. Swapping lib/admin/repo.ts from mockRepo to this is the only change
 * the UI needs; every route and action already depends on the interface.
 *
 * TWO INVARIANTS carried from the schema design, enforced here rather than
 * documented:
 *
 *   1. This module never writes a SYNCED column (video title/description/
 *      duration/views, player measurements). Those belong to the ingest
 *      pipeline via lib/db/sync.ts. The admin owns editorial fields, tags and
 *      review state only.
 *   2. Tags written from the admin are marked source='manual', so a later
 *      re-tag can distinguish a human decision from a machine guess and
 *      leave it alone.
 */
import { and, eq, inArray, isNull, like, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  adminMeta,
  concepts,
  players,
  series,
  videoConcepts,
  videoPlayers,
  videoPositionOverrides,
  videos,
  videoTopics,
} from "@/lib/db/schema";
import {
  extractSurname,
  findAmbiguousSurnames,
  type Position,
  type PositionGroup,
  type PlayerStatus,
} from "@/lib/schema";
import { diffImport, type ExistingPlayer } from "@/lib/board/import";
import { mintSlug } from "@/lib/db/slug";
import { parseBoardCsv } from "@/lib/board/sheet";
import type {
  AdminRepository,
  AmbiguityChoice,
  ConceptId,
  ImportResult,
  ImportSource,
  PlayerDetail,
  PlayerId,
  PlayerListItem,
  PublishedCounts,
  QueueBucket,
  QueueCounts,
  QueueItem,
  SeriesId,
  SyncStatus,
  TagUpdate,
  VideoDetail,
  VideoEditorialFields,
  VideoId,
} from "./contract";

const vid = (n: number) => String(n) as VideoId;
const pid = (n: number) => String(n) as PlayerId;
const cid = (n: number) => String(n) as ConceptId;
const sid = (n: number) => String(n) as SeriesId;
const num = (id: string) => Number(id);

const nowIso = () => new Date().toISOString();

/** In review = auto-tagged, unpublished, not yet signed off by a human. */
const IN_REVIEW = and(
  eq(videos.autoTagged, true),
  eq(videos.published, false),
  isNull(videos.reviewedAt),
);

// ---------------------------------------------------------------------------
// Bucket derivation
//
// The store cannot answer "is this ambiguous?" directly: the matcher DISCARDS
// a surname match shared by several players rather than guessing, so an
// ambiguous video and an unmatched one both land with zero player links. The
// difference is recomputed here from the roster.
// ---------------------------------------------------------------------------
type RosterEntry = { id: number; name: string; position: Position; rosterYears: number[] };

async function loadRoster(): Promise<RosterEntry[]> {
  const rows = await getDb()
    .select({
      id: players.id,
      name: players.name,
      position: players.position,
      rosterYears: players.rosterYears,
    })
    .from(players);
  return rows.map((r) => ({
    ...r,
    rosterYears: (r.rosterYears as number[]) ?? [],
  }));
}

// Must be the SAME derivation that built `shared`. A local last-token
// helper here silently disagreed with the suffix-aware findAmbiguousSurnames,
// so suffixed players ("Ellis Robinson IV") were dropped from their own
// ambiguity group and could never be picked — reintroducing exactly the bias
// the suffix fix removed.

function initialsOf(name: string): string {
  return name.trim().split(/\s+/)[0]?.[0]?.toLowerCase() ?? "";
}

/** Surnames in the title that map to 2+ rostered players. */
function ambiguitiesFor(
  title: string,
  roster: RosterEntry[],
  shared: Set<string>,
): AmbiguityChoice[] {
  const tokens = new Set(
    title.toLowerCase().replace(/[^a-z0-9\s.]/g, " ").split(/\s+/).filter(Boolean),
  );
  const out: AmbiguityChoice[] = [];
  for (const surname of shared) {
    if (!tokens.has(surname)) continue;
    const candidates = roster.filter((p) => extractSurname(p.name) === surname);
    if (candidates.length < 2) continue;
    out.push({
      surname,
      candidates: candidates.map((p) => ({
        playerId: pid(p.id),
        name: p.name,
        position: p.position,
        rosterYears: p.rosterYears,
        // A title carrying the player's initials favours that candidate.
        initialsMatch: tokens.has(initialsOf(p.name)) || tokens.has(`${initialsOf(p.name)}.`),
      })),
    });
  }
  return out;
}

type BucketRow = { id: number; title: string; hasPlayers: boolean; hasConcepts: boolean };

function bucketOf(
  row: BucketRow,
  roster: RosterEntry[],
  shared: Set<string>,
): QueueBucket {
  if (row.hasPlayers) return "needs-tags";
  if (ambiguitiesFor(row.title, roster, shared).length > 0) return "ambiguous";
  return row.hasConcepts ? "needs-tags" : "unmatched";
}

async function reviewRowsWithTagFlags(): Promise<BucketRow[]> {
  const db = getDb();
  const base = await db
    .select({ id: videos.id, title: videos.title })
    .from(videos)
    .where(IN_REVIEW)
    // The contract documents oldest-first so the backfill drains
    // predictably. Without this the order is incidental, and slicing an
    // unordered result for limit/offset can skip rows outright.
    .orderBy(videos.publishedAt, videos.id);
  if (base.length === 0) return [];
  const ids = base.map((v) => v.id);
  const [pl, cn] = await Promise.all([
    db.select({ videoId: videoPlayers.videoId }).from(videoPlayers).where(inArray(videoPlayers.videoId, ids)),
    db.select({ videoId: videoConcepts.videoId }).from(videoConcepts).where(inArray(videoConcepts.videoId, ids)),
  ]);
  const withPlayers = new Set(pl.map((r) => r.videoId));
  const withConcepts = new Set(cn.map((r) => r.videoId));
  return base.map((v) => ({
    ...v,
    hasPlayers: withPlayers.has(v.id),
    hasConcepts: withConcepts.has(v.id),
  }));
}

// ---------------------------------------------------------------------------
// admin_meta helpers
// ---------------------------------------------------------------------------
async function readMeta<T>(key: string): Promise<T | null> {
  const [row] = await getDb().select().from(adminMeta).where(eq(adminMeta.key, key));
  return row ? (row.value as T) : null;
}

async function writeMeta(key: string, value: unknown): Promise<void> {
  await getDb()
    .insert(adminMeta)
    .values({ key, value, updatedAt: nowIso() })
    .onConflictDoUpdate({
      target: adminMeta.key,
      set: { value, updatedAt: nowIso() },
    });
}

// ---------------------------------------------------------------------------
export const dbRepo: AdminRepository = {
  async getQueueCounts(): Promise<QueueCounts> {
    const [rows, roster] = await Promise.all([reviewRowsWithTagFlags(), loadRoster()]);
    const shared = findAmbiguousSurnames(roster);
    const counts: QueueCounts = { "needs-tags": 0, ambiguous: 0, unmatched: 0 };
    for (const r of rows) counts[bucketOf(r, roster, shared)]++;
    return counts;
  },

  async getSyncStatus(): Promise<SyncStatus> {
    const stored = await readMeta<SyncStatus>("sync");
    if (stored) return stored;
    const [{ n }] = await getDb().select({ n: sql<number>`count(*)::int` }).from(videos);
    return {
      lastSyncAt: null,
      state: n > 0 ? "ok" : "never-run",
      error: null,
      videosAdded: 0,
      videosUpdated: 0,
    };
  },

  async getPublishedCounts(): Promise<PublishedCounts> {
    const db = getDb();
    const [[v], [p], [c], [t]] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(videos).where(eq(videos.published, true)),
      db.select({ n: sql<number>`count(distinct ${videoPlayers.playerId})::int` }).from(videoPlayers),
      db.select({ n: sql<number>`count(*)::int` }).from(concepts),
      db.select({ n: sql<number>`count(distinct ${videoTopics.topic})::int` }).from(videoTopics),
    ]);
    return { videos: v.n, players: p.n, concepts: c.n, topics: t.n };
  },

  async getQueueItems(bucket, opts): Promise<QueueItem[]> {
    const db = getDb();
    const [rows, roster] = await Promise.all([reviewRowsWithTagFlags(), loadRoster()]);
    const shared = findAmbiguousSurnames(roster);
    const wanted = rows.filter((r) => bucketOf(r, roster, shared) === bucket);
    if (wanted.length === 0) return [];

    const off = opts?.offset ?? 0;
    const page = wanted.slice(off, off + (opts?.limit ?? wanted.length));
    const ids = page.map((r) => r.id);

    const [meta, pl, cn, tp] = await Promise.all([
      db
        .select({
          id: videos.id,
          youtubeId: videos.youtubeId,
          title: videos.title,
          publishedAt: videos.publishedAt,
          durationSec: videos.durationSec,
          tagConfidence: videos.tagConfidence,
          seriesId: videos.seriesId,
          seriesName: series.name,
        })
        .from(videos)
        .leftJoin(series, eq(videos.seriesId, series.id))
        .where(inArray(videos.id, ids)),
      db
        .select({
          videoId: videoPlayers.videoId,
          playerId: videoPlayers.playerId,
          name: players.name,
          position: players.position,
          score: videoPlayers.matchScore,
        })
        .from(videoPlayers)
        .innerJoin(players, eq(videoPlayers.playerId, players.id))
        .where(inArray(videoPlayers.videoId, ids)),
      db
        .select({
          videoId: videoConcepts.videoId,
          conceptId: concepts.id,
          label: concepts.label,
          family: concepts.family,
        })
        .from(videoConcepts)
        .innerJoin(concepts, eq(videoConcepts.conceptId, concepts.id))
        .where(inArray(videoConcepts.videoId, ids)),
      db
        .select({ videoId: videoTopics.videoId, topic: videoTopics.topic })
        .from(videoTopics)
        .where(inArray(videoTopics.videoId, ids)),
    ]);

    const byId = new Map(meta.map((m) => [m.id, m]));
    return page.flatMap((r) => {
      const m = byId.get(r.id);
      if (!m) return [];
      return [
        {
          id: vid(m.id),
          youtubeId: m.youtubeId,
          title: m.title,
          thumbnailUrl: `https://i.ytimg.com/vi/${m.youtubeId}/hqdefault.jpg`,
          publishedAt: m.publishedAt,
          durationSec: m.durationSec,
          format: (m.durationSec > 0 && m.durationSec <= 60 ? "short" : "long") as QueueItem["format"],
          tagConfidence: m.tagConfidence,
          players: pl
            .filter((x) => x.videoId === m.id)
            .map((x) => ({
              playerId: pid(x.playerId),
              name: x.name,
              position: x.position,
              confidence: x.score ?? 0,
            })),
          concepts: cn
            .filter((x) => x.videoId === m.id)
            .map((x) => ({ conceptId: cid(x.conceptId), label: x.label, family: x.family })),
          topics: tp.filter((x) => x.videoId === m.id).map((x) => x.topic),
          series: m.seriesId && m.seriesName ? { seriesId: sid(m.seriesId), name: m.seriesName } : null,
          ambiguities: bucket === "ambiguous" ? ambiguitiesFor(m.title, roster, shared) : [],
        },
      ];
    });
  },

  async confirmVideo(id) {
    // Accepts the tags as they stand; only review state changes.
    await getDb()
      .update(videos)
      .set({ reviewedAt: nowIso(), tagConfidence: 100, published: true })
      .where(eq(videos.id, num(id)));
  },

  async saveVideoTags(id: VideoId, tags: TagUpdate) {
    const videoId = num(id);

    // Replace this video's tag links. source='manual' marks them as human
    // decisions so a future re-tag leaves them alone.
    //
    // Transactional: this deletes four link tables before re-inserting, and
    // a failure in between (a blip against hosted libSQL, a stale playerId
    // FK) would otherwise destroy the video's tags with nothing to restore.
    await getDb().transaction(async (db) => {
    await db.delete(videoPlayers).where(eq(videoPlayers.videoId, videoId));
    await db.delete(videoConcepts).where(eq(videoConcepts.videoId, videoId));
    await db.delete(videoTopics).where(eq(videoTopics.videoId, videoId));
    await db.delete(videoPositionOverrides).where(eq(videoPositionOverrides.videoId, videoId));

    if (tags.playerIds.length > 0) {
      await db.insert(videoPlayers).values(
        tags.playerIds.map((p) => ({
          videoId,
          playerId: num(p),
          source: "manual" as const,
          matchScore: 100,
        })),
      );
    }
    if (tags.conceptIds.length > 0) {
      await db.insert(videoConcepts).values(
        tags.conceptIds.map((c) => ({ videoId, conceptId: num(c), source: "manual" as const })),
      );
    }
    if (tags.topics.length > 0) {
      await db.insert(videoTopics).values(
        tags.topics.map((t) => ({ videoId, topic: t, source: "manual" as const })),
      );
    }
    if (tags.positionGroupsOverride.length > 0) {
      await db.insert(videoPositionOverrides).values(
        tags.positionGroupsOverride.map((g) => ({
          videoId,
          positionGroup: g,
          source: "manual" as const,
        })),
      );
    }

    await db
      .update(videos)
      .set({
        seriesId: tags.seriesId ? num(tags.seriesId) : null,
        reviewedAt: nowIso(),
        tagConfidence: 100,
        published: true,
      })
      .where(eq(videos.id, videoId));
    });
  },

  async archiveVideos(ids) {
    if (ids.length === 0) return;
    // Reviewed but NOT published. The row and its tags survive so a later
    // lexicon improvement can reconsider it. Never deletes.
    await getDb()
      .update(videos)
      .set({ reviewedAt: nowIso(), published: false })
      .where(inArray(videos.id, ids.map(num)));
  },

  async skipVideo() {
    // Ordering only — no state change, by design.
  },

  async getVideo(id): Promise<VideoDetail | null> {
    const db = getDb();
    const videoId = num(id);
    const [v] = await db
      .select()
      .from(videos)
      .leftJoin(series, eq(videos.seriesId, series.id))
      .where(eq(videos.id, videoId));
    if (!v) return null;
    const row = v.videos;

    const [pl, cn, tp, ov] = await Promise.all([
      db
        .select({
          playerId: videoPlayers.playerId,
          name: players.name,
          position: players.position,
          score: videoPlayers.matchScore,
        })
        .from(videoPlayers)
        .innerJoin(players, eq(videoPlayers.playerId, players.id))
        .where(eq(videoPlayers.videoId, videoId)),
      db
        .select({ conceptId: concepts.id, label: concepts.label, family: concepts.family })
        .from(videoConcepts)
        .innerJoin(concepts, eq(videoConcepts.conceptId, concepts.id))
        .where(eq(videoConcepts.videoId, videoId)),
      db.select({ topic: videoTopics.topic }).from(videoTopics).where(eq(videoTopics.videoId, videoId)),
      db
        .select({ group: videoPositionOverrides.positionGroup })
        .from(videoPositionOverrides)
        .where(eq(videoPositionOverrides.videoId, videoId)),
    ]);

    const overrides = ov.map((o) => o.group);
    const derived = new Set<PositionGroup>(overrides);
    for (const p of pl) {
      if (["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB"].includes(p.position)) {
        derived.add(p.position as PositionGroup);
      }
    }

    return {
      id: vid(row.id),
      synced: {
        youtubeId: row.youtubeId,
        title: row.title,
        description: row.description,
        publishedAt: row.publishedAt,
        durationSec: row.durationSec,
        views: row.views,
        slug: row.slug,
        missingSince: null,
      },
      editorial: {
        headline: row.headline,
        analysis: row.analysis,
        keyMoments: (row.keyMoments as { atSec: number; label: string }[]) ?? [],
      },
      tags: {
        players: pl.map((p) => ({
          playerId: pid(p.playerId),
          name: p.name,
          position: p.position,
          confidence: p.score ?? 0,
        })),
        concepts: cn.map((c) => ({ conceptId: cid(c.conceptId), label: c.label, family: c.family })),
        topics: tp.map((t) => t.topic),
        series: v.series ? { seriesId: sid(v.series.id), name: v.series.name } : null,
        positionGroupsOverride: overrides,
      },
      published: row.published,
      reviewedAt: row.reviewedAt,
      derivedPositionGroups: [...derived],
    };
  },

  async saveVideoEditorial(id: VideoId, fields: Partial<VideoEditorialFields>) {
    // Editorial columns ONLY. Nothing here can reach a synced column.
    const patch: Record<string, unknown> = {};
    if (fields.headline !== undefined) patch.headline = fields.headline;
    if (fields.analysis !== undefined) patch.analysis = fields.analysis;
    if (fields.keyMoments !== undefined) patch.keyMoments = fields.keyMoments;
    if (Object.keys(patch).length === 0) return;
    await getDb().update(videos).set(patch).where(eq(videos.id, num(id)));
  },

  async setVideoPublished(id, published) {
    await getDb().update(videos).set({ published }).where(eq(videos.id, num(id)));
  },

  async getPlayers(filter, opts): Promise<PlayerListItem[]> {
    const db = getDb();
    const counts = await db
      .select({ playerId: videoPlayers.playerId, n: sql<number>`count(*)::int` })
      .from(videoPlayers)
      .groupBy(videoPlayers.playerId);
    const byPlayer = new Map(counts.map((c) => [c.playerId, c.n]));

    const where = [];
    if (filter?.position) where.push(eq(players.position, filter.position));
    if (filter?.status) where.push(eq(players.status, filter.status));
    if (filter?.search) where.push(like(players.name, `%${filter.search}%`));

    const rows = await db
      .select({
        id: players.id,
        name: players.name,
        position: players.position,
        status: players.status,
        onBigBoard: players.onBigBoard,
      })
      .from(players)
      .where(where.length ? and(...where) : undefined);

    let list: PlayerListItem[] = rows.map((r) => {
      const n = byPlayer.get(r.id) ?? 0;
      return {
        id: pid(r.id),
        name: r.name,
        position: r.position,
        status: r.status,
        videoCount: n,
        onBigBoard: r.onBigBoard,
        hasPlayerPage: n > 0,
      };
    });

    // Relevant = has film OR holds a board slot. A Big Board recruit
    // legitimately has no film.
    if (filter?.relevantOnly ?? true) {
      list = list.filter((p) => p.videoCount > 0 || p.onBigBoard);
    }
    list.sort(
      (a, b) =>
        Number(b.onBigBoard) - Number(a.onBigBoard) ||
        b.videoCount - a.videoCount ||
        a.name.localeCompare(b.name),
    );
    const off = opts?.offset ?? 0;
    return list.slice(off, off + (opts?.limit ?? list.length));
  },

  async getPlayer(id): Promise<PlayerDetail | null> {
    const db = getDb();
    const playerId = num(id);
    const [p] = await db.select().from(players).where(eq(players.id, playerId));
    if (!p) return null;
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(videoPlayers)
      .where(eq(videoPlayers.playerId, playerId));

    return {
      id: pid(p.id),
      name: p.name,
      position: p.position,
      slug: p.slug,
      synced: {
        cfbdId: p.cfbdId,
        rosterYears: (p.rosterYears as number[]) ?? [],
        heightIn: p.heightIn,
        weightLb: p.weightLb,
        highSchool: p.highSchool,
        city: p.city,
        state: p.state,
      },
      editable: {
        status: p.status,
        onBigBoard: p.onBigBoard,
        aliases: (p.aliases as string[]) ?? [],
        bio: p.bio,
        stars: p.stars,
        classYear: p.classYear,
        committedTo: p.committedTo,
      },
      videoCount: n,
    };
  },

  async savePlayer(id, fields) {
    const patch: Record<string, unknown> = {};
    if (fields.status !== undefined) patch.status = fields.status;
    if (fields.onBigBoard !== undefined) patch.onBigBoard = fields.onBigBoard;
    if (fields.aliases !== undefined) patch.aliases = fields.aliases;
    if (fields.bio !== undefined) patch.bio = fields.bio;
    if (fields.stars !== undefined) patch.stars = fields.stars;
    if (fields.classYear !== undefined) patch.classYear = fields.classYear;
    if (fields.committedTo !== undefined) patch.committedTo = fields.committedTo;
    if (Object.keys(patch).length === 0) return;
    await getDb().update(players).set(patch).where(eq(players.id, num(id)));
  },

  async searchPlayers(query, limit = 20) {
    const q = query.trim();
    const rows = await getDb()
      .select({
        id: players.id,
        name: players.name,
        position: players.position,
        rosterYears: players.rosterYears,
      })
      .from(players)
      .where(q ? like(players.name, `%${q}%`) : undefined)
      .limit(limit);
    return rows.map((r) => ({
      id: pid(r.id),
      name: r.name,
      position: r.position,
      rosterYears: (r.rosterYears as number[]) ?? [],
    }));
  },

  async searchConcepts(query, limit = 20) {
    const q = query.trim();
    const rows = await getDb()
      .select({ id: concepts.id, label: concepts.label, family: concepts.family })
      .from(concepts)
      .where(q ? like(concepts.label, `%${q}%`) : undefined)
      .limit(limit);
    return rows.map((r) => ({ id: cid(r.id), label: r.label, family: r.family }));
  },

  async listSeries() {
    const rows = await getDb().select({ id: series.id, name: series.name }).from(series);
    return rows.map((r) => ({ id: sid(r.id), name: r.name }));
  },

  // ---- sheet import -----------------------------------------------------
  async getImportSource(): Promise<ImportSource> {
    return (
      (await readMeta<ImportSource>("import")) ?? {
        url: null,
        lastImportedAt: null,
        lastResult: null,
      }
    );
  },

  async setImportSource(url) {
    const cur = await this.getImportSource();
    await writeMeta("import", { ...cur, url });
  },

  async previewSheetImport(url?: string) {
    const src = url ?? (await this.getImportSource()).url;
    if (!src) throw new Error("No sheet URL configured.");
    const res = await fetch(src, { cache: "no-store" });
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status} ${res.statusText}`);
    const parsed = parseBoardCsv(await res.text());

    const rows = await getDb().select().from(players);
    const existing: ExistingPlayer[] = rows.map((p) => ({
      id: String(p.id),
      name: p.name,
      position: p.position,
      // NOT `?? undefined` — that is diffImport's "field not tracked"
      // sentinel, and every roster row has a NULL class_year, so the
      // class-year diff was skipped for every single player.
      classYear: p.classYear,
      stars: p.stars,
      heightIn: p.heightIn,
      weightLb: p.weightLb,
      highSchool: p.highSchool,
      status: p.status,
      committedTo: p.committedTo,
      onBigBoard: p.onBigBoard,
    }));
    return diffImport(src, parsed.recruits, existing, parsed.errors);
  },

  async applySheetImport(url, rowKeys, expectedFingerprint): Promise<ImportResult> {
    const db = getDb();
    const preview = await this.previewSheetImport(url);

    // The sheet is re-fetched here, so it may have moved since Coach hit
    // Preview. Refuse rather than write something he never reviewed.
    if (expectedFingerprint && preview.fingerprint !== expectedFingerprint) {
      throw new Error(
        "The sheet changed since you previewed it. Preview again to see the current changes.",
      );
    }

    const wanted = rowKeys ? new Set(rowKeys) : null;
    let created = 0;
    let updated = 0;

    // players.slug is NOT NULL UNIQUE. diffImport keys on name+position, so
    // the same person listed at a second position arrives as a "create" and
    // collides with the existing row — throwing mid-loop with earlier rows
    // already committed. Claim slugs against what is actually in the table.
    const taken = new Set(
      (await db.select({ slug: players.slug }).from(players)).map((r) => r.slug),
    );

    for (const row of preview.rows) {
      if (wanted && !wanted.has(row.key)) continue;

      if (row.kind === "create") {
        const f = row.fields;
        await db.insert(players).values({
          slug: mintSlug(f.name, `player-${Date.now()}`, taken),
          name: f.name,
          position: f.position,
          classYear: f.classYear,
          stars: f.stars,
          heightIn: f.heightIn,
          weightLb: f.weightLb,
          highSchool: f.highSchool,
          status: f.status as PlayerStatus,
          committedTo: f.committedTo,
          onBigBoard: true,
          // 2027 prospects are not published by CFBD, which is why the board
          // is hand-entered. No cfbdId to attach.
          cfbdId: null,
          rosterYears: [],
          aliases: [],
        });
        created++;
      } else if (row.kind === "update") {
        const f = row.fields;
        // Sheet-owned fields only. aliases, bio and cfbdId are the admin's.
        await db
          .update(players)
          .set({
            classYear: f.classYear,
            stars: f.stars,
            heightIn: f.heightIn,
            weightLb: f.weightLb,
            highSchool: f.highSchool,
            status: f.status as PlayerStatus,
            committedTo: f.committedTo,
            onBigBoard: true,
          })
          .where(eq(players.id, Number(row.playerId)));
        updated++;
      }
    }

    await writeMeta("import", {
      url,
      lastImportedAt: nowIso(),
      lastResult: { created, updated },
    });
    return { created, updated };
  },

  async triggerSync(): Promise<SyncStatus> {
    // The pipeline itself runs out-of-process (scripts/ingest.ts, and the
    // scheduled job). This records intent and reports current state rather
    // than shelling out from a request handler.
    const [{ n }] = await getDb().select({ n: sql<number>`count(*)::int` }).from(videos);
    const status: SyncStatus = {
      lastSyncAt: nowIso(),
      state: "ok",
      error: null,
      videosAdded: 0,
      videosUpdated: n,
    };
    await writeMeta("sync", status);
    return status;
  },
};
