/**
 * AdminRepository over Drizzle/libSQL — the seam between the admin UI and the
 * store. Every route and action depends on the interface in ./contract, never
 * on this file directly — lib/admin/repo.ts is the only place it is named.
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
import { and, desc, eq, gt, inArray, isNotNull, isNull, like, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  adminMeta,
  concepts,
  pageContent,
  patreonPosts,
  players,
  series,
  videoConcepts,
  videoPlayers,
  videoPositionOverrides,
  videos,
  videoTopics,
} from "@/lib/db/schema";
import {
  SHORT_MAX_SECONDS,
  deriveFormat,
  extractSurname,
  findAmbiguousSurnames,
  type Position,
  type PositionGroup,
  type PlayerStatus,
} from "@/lib/schema";
import { diffImport, type ExistingPlayer } from "@/lib/board/import";
import { mintSlug } from "@/lib/db/slug";
import { isValidPattern } from "@/lib/ingest/tagger";
import { parseBoardCsv } from "@/lib/board/sheet";
import { normalizePatreonUrl } from "@/lib/patreon";
import { COPY_PAGES, copyPage, type CopyPage } from "@/lib/content/copy";
import type {
  AdminRepository,
  ConceptDetail,
  ConceptListItem,
  AmbiguityChoice,
  ConceptId,
  CopyPageState,
  PatreonPostDetail,
  PatreonPostId,
  PatreonPostInput,
  PatreonPostListItem,
  VideoListFilter,
  VideoListItem,
  WritingItem,
  WritingKind,
  WritingQueue,
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
const ppid = (n: number) => String(n) as PatreonPostId;
const num = (id: string) => Number(id);

const nowIso = () => new Date().toISOString();

/**
 * Concept patterns are compiled by the tagger with `new RegExp(s, "i")`.
 * Rejecting a bad one here is what keeps a typo in the admin from costing a
 * concept its auto-tagging on the next ingest.
 */
function assertPatternsValid(patterns: string[]): void {
  const bad = patterns.filter((p) => !isValidPattern(p));
  if (bad.length > 0) {
    throw new Error(
      `Not a valid pattern: ${bad.join(", ")}. Check for an unclosed bracket or parenthesis.`,
    );
  }
}

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

  /**
   * Counts PAGES, not rows. The old version counted every player and concept
   * ever tagged, including on the 169 videos still sitting in the queue, so
   * the dashboard claimed 83 players and 87 concepts when 53 and 39 had pages.
   *
   * Each count mirrors the public query that decides whether a page exists,
   * so the scoreboard and the site can't drift apart.
   */
  async getPublishedCounts(): Promise<PublishedCounts> {
    const db = getDb();
    const published = eq(videos.published, true);
    const longForm = gt(videos.durationSec, SHORT_MAX_SECONDS);

    const [[v], [f], [p], [c]] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(videos).where(published),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(videos)
        .where(and(published, longForm)),
      db
        .select({ n: sql<number>`count(distinct ${videoPlayers.playerId})::int` })
        .from(videoPlayers)
        .innerJoin(videos, eq(videos.id, videoPlayers.videoId))
        .where(published),
      db
        .select({ n: sql<number>`count(distinct ${videoConcepts.conceptId})::int` })
        .from(videoConcepts)
        .innerJoin(videos, eq(videos.id, videoConcepts.videoId))
        .where(published),
    ]);
    return {
      videosPublished: v.n,
      filmPages: f.n,
      playerPages: p.n,
      conceptPages: c.n,
    };
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

  async listVideos(
    filter?: VideoListFilter,
    opts?: { limit?: number; offset?: number },
  ): Promise<VideoListItem[]> {
    const db = getDb();
    const rows = await db
      .select({
        id: videos.id,
        youtubeId: videos.youtubeId,
        title: videos.title,
        headline: videos.headline,
        publishedAt: videos.publishedAt,
        durationSec: videos.durationSec,
        published: videos.published,
        reviewedAt: videos.reviewedAt,
        patreonUrl: videos.patreonUrl,
      })
      .from(videos)
      .where(videoFilter(filter))
      .orderBy(desc(videos.publishedAt), desc(videos.id))
      .limit(opts?.limit ?? 50)
      .offset(opts?.offset ?? 0);

    if (rows.length === 0) return [];
    const names = await playerNamesFor(rows.map((r) => r.id));
    return rows.map((r) => ({
      id: vid(r.id),
      youtubeId: r.youtubeId,
      title: r.headline ?? r.title,
      publishedAt: r.publishedAt,
      durationSec: r.durationSec,
      format: deriveFormat(r.durationSec),
      published: r.published,
      reviewedAt: r.reviewedAt,
      hasPatreonUrl: r.patreonUrl != null,
      playerNames: names.get(r.id) ?? [],
    }));
  },

  async countVideos(filter?: VideoListFilter): Promise<number> {
    const [{ n }] = await getDb()
      .select({ n: sql<number>`count(*)::int` })
      .from(videos)
      .where(videoFilter(filter));
    return n;
  },

  async listVideosForPlayer(id: PlayerId): Promise<VideoListItem[]> {
    const rows = await getDb()
      .select({
        id: videos.id,
        youtubeId: videos.youtubeId,
        title: videos.title,
        headline: videos.headline,
        publishedAt: videos.publishedAt,
        durationSec: videos.durationSec,
        published: videos.published,
        reviewedAt: videos.reviewedAt,
        patreonUrl: videos.patreonUrl,
      })
      .from(videos)
      .innerJoin(videoPlayers, eq(videoPlayers.videoId, videos.id))
      .where(eq(videoPlayers.playerId, num(id)))
      // Live ones first. A heavily-tagged player can carry seventy videos of
      // which three are published, and the published three are exactly the
      // ones that had no route back to them before this list existed.
      .orderBy(desc(videos.published), desc(videos.publishedAt));

    return rows.map((r) => ({
      id: vid(r.id),
      youtubeId: r.youtubeId,
      title: r.headline ?? r.title,
      publishedAt: r.publishedAt,
      durationSec: r.durationSec,
      format: deriveFormat(r.durationSec),
      published: r.published,
      reviewedAt: r.reviewedAt,
      hasPatreonUrl: r.patreonUrl != null,
      playerNames: [],
    }));
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
        patreonUrl: row.patreonUrl,
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
    if (fields.patreonUrl !== undefined) {
      if (fields.patreonUrl === null) patch.patreonUrl = null;
      else {
        const url = normalizePatreonUrl(fields.patreonUrl);
        if (!url) {
          throw new Error(
            "That is not a Patreon post link. It should look like " +
              "patreon.com/CoachHayesHudl/posts/… — the campaign page on its " +
              "own will not do.",
          );
        }
        patch.patreonUrl = url;
      }
    }
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

  // ---- concepts ---------------------------------------------------------
  async listConcepts(): Promise<ConceptListItem[]> {
    const db = getDb();
    const counts = await db
      .select({
        conceptId: videoConcepts.conceptId,
        n: sql<number>`count(*)::int`,
      })
      .from(videoConcepts)
      .innerJoin(videos, eq(videos.id, videoConcepts.videoId))
      .where(eq(videos.published, true))
      .groupBy(videoConcepts.conceptId);
    const byConcept = new Map(counts.map((c) => [c.conceptId, c.n]));

    const rows = await db.select().from(concepts).orderBy(concepts.label);
    return rows.map((c) => ({
      id: cid(c.id),
      slug: c.slug,
      label: c.label,
      family: c.family,
      filmCount: byConcept.get(c.id) ?? 0,
      patternCount: ((c.matchPatterns as string[]) ?? []).length,
      hasExplainer: Boolean(c.explainer),
    }));
  },

  async getConcept(id): Promise<ConceptDetail | null> {
    const db = getDb();
    const [c] = await db.select().from(concepts).where(eq(concepts.id, num(id)));
    if (!c) return null;
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(videoConcepts)
      .innerJoin(videos, eq(videos.id, videoConcepts.videoId))
      .where(and(eq(videoConcepts.conceptId, c.id), eq(videos.published, true)));
    return {
      id: cid(c.id),
      slug: c.slug,
      label: c.label,
      family: c.family,
      matchPatterns: (c.matchPatterns as string[]) ?? [],
      explainer: c.explainer,
      filmCount: n,
    };
  },

  async createConcept(input): Promise<ConceptId> {
    assertPatternsValid(input.matchPatterns);
    const db = getDb();
    const taken = new Set(
      (await db.select({ slug: concepts.slug }).from(concepts)).map((r) => r.slug),
    );
    const slug = mintSlug(input.label, `concept-${Date.now()}`, taken);
    const [row] = await db
      .insert(concepts)
      .values({
        slug,
        label: input.label.trim(),
        family: input.family,
        matchPatterns: input.matchPatterns,
        explainer: input.explainer,
        relatedConcepts: [],
      })
      .returning({ id: concepts.id });
    return cid(row.id);
  },

  async updateConcept(id, input) {
    assertPatternsValid(input.matchPatterns);
    // Slug deliberately absent: it is the published /playbook URL.
    await getDb()
      .update(concepts)
      .set({
        label: input.label.trim(),
        family: input.family,
        matchPatterns: input.matchPatterns,
        explainer: input.explainer,
      })
      .where(eq(concepts.id, num(id)));
  },

  async deleteConcept(id) {
    const db = getDb();
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(videoConcepts)
      .where(eq(videoConcepts.conceptId, num(id)));
    if (n > 0) {
      throw new Error(
        `Still used by ${n} video${n === 1 ? "" : "s"}. Remove the tag from those videos first.`,
      );
    }
    await db.delete(concepts).where(eq(concepts.id, num(id)));
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

  // ---- writing queue ----------------------------------------------------

  async getWritingQueue(): Promise<WritingQueue> {
    const db = getDb();

    const [conceptRows, conceptTitles, playerRows, playerTitles] =
      await Promise.all([
        db
          .select({
            id: concepts.id,
            label: concepts.label,
            slug: concepts.slug,
            family: concepts.family,
            explainer: concepts.explainer,
            videoCount: sql<number>`count(${videos.id})::int`,
          })
          .from(concepts)
          .innerJoin(videoConcepts, eq(videoConcepts.conceptId, concepts.id))
          .innerJoin(videos, eq(videos.id, videoConcepts.videoId))
          .where(eq(videos.published, true))
          .groupBy(concepts.id),
        db
          .select({
            key: videoConcepts.conceptId,
            title: videos.title,
            headline: videos.headline,
            views: videos.views,
          })
          .from(videoConcepts)
          .innerJoin(videos, eq(videos.id, videoConcepts.videoId))
          .where(eq(videos.published, true)),
        db
          .select({
            id: players.id,
            name: players.name,
            slug: players.slug,
            position: players.position,
            status: players.status,
            bio: players.bio,
            videoCount: sql<number>`count(${videos.id})::int`,
          })
          .from(players)
          .innerJoin(videoPlayers, eq(videoPlayers.playerId, players.id))
          .innerJoin(videos, eq(videos.id, videoPlayers.videoId))
          .where(eq(videos.published, true))
          .groupBy(players.id),
        db
          .select({
            key: videoPlayers.playerId,
            title: videos.title,
            headline: videos.headline,
            views: videos.views,
          })
          .from(videoPlayers)
          .innerJoin(videos, eq(videos.id, videoPlayers.videoId))
          .where(eq(videos.published, true)),
      ]);

    const conceptExamples = topTitles(conceptTitles);
    const playerExamples = topTitles(playerTitles);

    return {
      concepts: conceptRows
        .map(
          (c): WritingItem => ({
            kind: "concept",
            id: String(cid(c.id)),
            label: c.label,
            context: c.family,
            publicHref: `/playbook/${c.slug}`,
            adminHref: `/admin/concepts/${c.id}`,
            videoCount: c.videoCount,
            examples: conceptExamples.get(c.id) ?? [],
            text: c.explainer,
          }),
        )
        .sort(byWritingPriority),
      players: playerRows
        .map(
          (p): WritingItem => ({
            kind: "player",
            id: String(pid(p.id)),
            label: p.name,
            context: `${p.position} · ${p.status.replace(/-/g, " ")}`,
            publicHref: `/players/${p.slug}`,
            adminHref: `/admin/player/${p.id}`,
            videoCount: p.videoCount,
            examples: playerExamples.get(p.id) ?? [],
            text: p.bio,
          }),
        )
        .sort(byWritingPriority),
    };
  },

  async saveWriting(
    items: Array<{ kind: WritingKind; id: string; text: string }>,
  ): Promise<void> {
    if (items.length === 0) return;
    const db = getDb();
    await db.transaction(async (tx) => {
      for (const item of items) {
        // Blank means "no text", the same thing the public pages check for —
        // storing "" would render an empty paragraph rather than no paragraph.
        const text = item.text.trim() || null;
        if (item.kind === "concept") {
          await tx
            .update(concepts)
            .set({ explainer: text })
            .where(eq(concepts.id, num(item.id)));
        } else {
          await tx
            .update(players)
            .set({ bio: text })
            .where(eq(players.id, num(item.id)));
        }
      }
    });
  },

  // ---- patreon shelf ----------------------------------------------------

  async listPatreonPosts(): Promise<PatreonPostListItem[]> {
    return shapePatreonRows(await selectPatreonRows());
  },

  async getPatreonPost(id: PatreonPostId): Promise<PatreonPostDetail | null> {
    const rows = await selectPatreonRows(num(id));
    return shapePatreonRows(rows)[0] ?? null;
  },

  async createPatreonPost(input: PatreonPostInput): Promise<PatreonPostId> {
    const values = validatePatreonInput(input);
    try {
      const [r] = await getDb()
        .insert(patreonPosts)
        .values(values)
        .returning({ id: patreonPosts.id });
      return ppid(r.id);
    } catch (err) {
      throw asDuplicateUrlError(err);
    }
  },

  async updatePatreonPost(id: PatreonPostId, input: PatreonPostInput) {
    const values = validatePatreonInput(input);
    try {
      await getDb()
        .update(patreonPosts)
        .set(values)
        .where(eq(patreonPosts.id, num(id)));
    } catch (err) {
      throw asDuplicateUrlError(err);
    }
  },

  async deletePatreonPost(id: PatreonPostId) {
    await getDb().delete(patreonPosts).where(eq(patreonPosts.id, num(id)));
  },

  // ---- page copy --------------------------------------------------------

  async listPageCopy(): Promise<CopyPageState[]> {
    const overrides = await readOverrides();
    return (COPY_PAGES as readonly CopyPage[]).map((p) =>
      shapeCopyPage(p, overrides),
    );
  },

  async getPageCopy(pageId: string): Promise<CopyPageState | null> {
    const page = copyPage(pageId);
    if (!page) return null;
    return shapeCopyPage(page, await readOverrides());
  },

  async savePageCopy(
    pageId: string,
    values: Record<string, string>,
  ): Promise<void> {
    const page = copyPage(pageId);
    if (!page) throw new Error(`Unknown page: ${pageId}`);

    // Only fields declared for THIS page are writable through it. Without the
    // check a crafted post could set any key in the registry from any form.
    const fields = new Map(page.fields.map((f) => [f.key, f]));
    const now = nowIso();
    const upserts: Array<{ key: string; value: string; updatedAt: string }> = [];
    const deletes: string[] = [];

    for (const [key, raw] of Object.entries(values)) {
      const field = fields.get(key);
      if (!field) continue;
      const value = raw.trim();
      // Blank, or the same as what ships in the code: both mean "default", and
      // storing either would pin today's wording if the default is ever edited.
      if (!value || value === field.fallback.trim()) deletes.push(key);
      else upserts.push({ key, value, updatedAt: now });
    }

    const db = getDb();
    await db.transaction(async (tx) => {
      if (deletes.length > 0) {
        await tx.delete(pageContent).where(inArray(pageContent.key, deletes));
      }
      for (const row of upserts) {
        await tx
          .insert(pageContent)
          .values(row)
          .onConflictDoUpdate({
            target: pageContent.key,
            set: { value: row.value, updatedAt: row.updatedAt },
          });
      }
    });
  },
};

// ---------------------------------------------------------------------------
// Video list helpers
// ---------------------------------------------------------------------------

function videoFilter(f?: VideoListFilter) {
  const parts = [];
  if (f?.query) {
    // Match the raw title and the editorial headline: Coach searches for the
    // words he remembers, and those may live in either one.
    const q = `%${f.query.replace(/[%_]/g, "")}%`;
    parts.push(
      sql`(${videos.title} ilike ${q} or coalesce(${videos.headline}, '') ilike ${q})`,
    );
  }
  if (f?.published !== undefined) parts.push(eq(videos.published, f.published));
  if (f?.format === "short") parts.push(lte(videos.durationSec, SHORT_MAX_SECONDS));
  if (f?.format === "long") parts.push(gt(videos.durationSec, SHORT_MAX_SECONDS));
  if (f?.patreonOnly) parts.push(isNotNull(videos.patreonUrl));
  return parts.length > 0 ? and(...parts) : undefined;
}

async function playerNamesFor(ids: number[]): Promise<Map<number, string[]>> {
  const rows = await getDb()
    .select({ videoId: videoPlayers.videoId, name: players.name })
    .from(videoPlayers)
    .innerJoin(players, eq(players.id, videoPlayers.playerId))
    .where(inArray(videoPlayers.videoId, ids));
  const out = new Map<number, string[]>();
  for (const r of rows) {
    const arr = out.get(r.videoId) ?? [];
    arr.push(r.name);
    out.set(r.videoId, arr);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Writing queue helpers
// ---------------------------------------------------------------------------

/** Unwritten first, then most film — the order that spends Coach's time best. */
function byWritingPriority(a: WritingItem, b: WritingItem): number {
  const aEmpty = a.text == null ? 0 : 1;
  const bEmpty = b.text == null ? 0 : 1;
  return aEmpty - bEmpty || b.videoCount - a.videoCount || a.label.localeCompare(b.label);
}

/** Up to three most-watched titles per key, as writing material. */
function topTitles(
  rows: Array<{ key: number; title: string; headline: string | null; views: number }>,
): Map<number, string[]> {
  const byKey = new Map<number, typeof rows>();
  for (const r of rows) {
    const arr = byKey.get(r.key) ?? [];
    arr.push(r);
    byKey.set(r.key, arr);
  }
  const out = new Map<number, string[]>();
  for (const [key, arr] of byKey) {
    out.set(
      key,
      arr
        .sort((a, b) => b.views - a.views)
        .slice(0, 3)
        .map((r) => r.headline ?? r.title),
    );
  }
  return out;
}

// ---------------------------------------------------------------------------
// Patreon shelf helpers
// ---------------------------------------------------------------------------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function validatePatreonInput(input: PatreonPostInput) {
  const url = normalizePatreonUrl(input.url);
  if (!url) {
    throw new Error(
      "That is not a Patreon post link. It should look like " +
        "patreon.com/CoachHayesHudl/posts/… — the campaign page on its own " +
        "will not do.",
    );
  }
  const title = input.title.trim();
  if (!title) throw new Error("Give the post a title.");

  const postedAt = input.postedAt?.trim() || null;
  if (postedAt && !ISO_DATE.test(postedAt)) {
    throw new Error("Posted date must look like 2026-09-06.");
  }

  // Fallback art is rendered in an <img src>. Restricting it to http(s) keeps
  // a javascript: or data: url from being pasted into the page.
  const thumbnailUrl = input.thumbnailUrl?.trim() || null;
  if (thumbnailUrl && !/^https?:\/\//i.test(thumbnailUrl)) {
    throw new Error("Image link must start with http:// or https://");
  }

  return {
    url,
    title,
    teaser: input.teaser?.trim() || null,
    thumbnailUrl,
    postedAt,
    published: input.published,
  };
}

/**
 * Drizzle wraps the driver error, so the unique-violation detail is down the
 * cause chain — err.message is only "Failed query: insert into …", which would
 * put raw SQL and the pasted url in front of Coach.
 */
function asDuplicateUrlError(err: unknown): Error {
  for (let e: unknown = err, depth = 0; e && depth < 5; depth++) {
    if (typeof e === "object") {
      const code = (e as { code?: unknown }).code;
      if (code === "23505") {
        return new Error("That Patreon post is already on the shelf.");
      }
      const message = (e as { message?: unknown }).message;
      if (typeof message === "string" && /duplicate key|unique constraint/i.test(message)) {
        return new Error("That Patreon post is already on the shelf.");
      }
      e = (e as { cause?: unknown }).cause;
    } else break;
  }
  return err instanceof Error ? err : new Error(String(err));
}

/**
 * A post and its on-site preview clip, joined on the url the video carries.
 * That join is why there is no second "which video previews this" column: the
 * video already points at the post, and one arrow is easier to keep true than
 * two.
 */
async function selectPatreonRows(id?: number) {
  const db = getDb();
  const base = db
    .select({
      id: patreonPosts.id,
      url: patreonPosts.url,
      title: patreonPosts.title,
      teaser: patreonPosts.teaser,
      thumbnailUrl: patreonPosts.thumbnailUrl,
      postedAt: patreonPosts.postedAt,
      published: patreonPosts.published,
      previewSlug: videos.slug,
    })
    .from(patreonPosts)
    .leftJoin(
      videos,
      and(eq(videos.patreonUrl, patreonPosts.url), eq(videos.published, true)),
    );
  return id == null
    ? base.where(sql`true`)
    : base.where(eq(patreonPosts.id, id));
}

/**
 * Collapse the join. Two published videos could name the same post; the shelf
 * shows one card either way, and the first preview wins.
 */
function shapePatreonRows(
  rows: Awaited<ReturnType<typeof selectPatreonRows>>,
): PatreonPostListItem[] {
  const byId = new Map<number, PatreonPostListItem>();
  for (const r of rows) {
    const existing = byId.get(r.id);
    if (existing) {
      existing.previewSlug ??= r.previewSlug;
      continue;
    }
    byId.set(r.id, {
      id: ppid(r.id),
      url: r.url,
      title: r.title,
      teaser: r.teaser,
      thumbnailUrl: r.thumbnailUrl,
      postedAt: r.postedAt,
      published: r.published,
      previewSlug: r.previewSlug,
    });
  }
  return [...byId.values()].sort(
    (a, b) =>
      (b.postedAt ?? "").localeCompare(a.postedAt ?? "") ||
      Number(b.id) - Number(a.id),
  );
}

// ---------------------------------------------------------------------------
// Page copy helpers
// ---------------------------------------------------------------------------

type StoredCopy = Map<string, { value: string; updatedAt: string }>;

async function readOverrides(): Promise<StoredCopy> {
  const rows = await getDb().select().from(pageContent);
  return new Map(
    rows.map((r) => [r.key, { value: r.value, updatedAt: r.updatedAt }]),
  );
}

function shapeCopyPage(page: CopyPage, stored: StoredCopy): CopyPageState {
  const fields = page.fields.map((f) => {
    const row = stored.get(f.key);
    return {
      key: f.key,
      label: f.label,
      kind: f.kind,
      help: f.help,
      maxLength: f.maxLength,
      fallback: f.fallback,
      value: row?.value ?? null,
      updatedAt: row?.updatedAt ?? null,
    };
  });
  return {
    id: page.id,
    label: page.label,
    path: page.path,
    fields,
    customized: fields.filter((f) => f.value !== null).length,
  };
}
