/**
 * Public read queries. Distinct from lib/db/queries.ts (admin) on purpose:
 * everything here filters to PUBLISHED content, so an unreviewed or archived
 * video can never leak onto the public site through a shared helper.
 */
import { and, desc, eq, gt, inArray, ne, sql } from "drizzle-orm";
import { getDb } from "./client";
import {
  concepts,
  players,
  series,
  videoConcepts,
  videoPlayers,
  videos,
  videoTopics,
} from "./schema";
import { SHORT_MAX_SECONDS, type Position } from "@/lib/schema";

export type PublicVideo = {
  youtubeId: string;
  slug: string;
  title: string;
  publishedAt: string;
  durationSec: number;
  views: number;
  isShort: boolean;
};

export type PublicPlayer = {
  slug: string;
  name: string;
  position: Position;
  classYear: number | null;
  stars: number | null;
  heightIn: number | null;
  weightLb: number | null;
  highSchool: string | null;
  city: string | null;
  state: string | null;
  status: string;
  committedTo: string | null;
  rosterYears: number[];
  bio: string | null;
};

export type PlayerPage = {
  player: PublicPlayer;
  videos: PublicVideo[];
  /** Concepts appearing across this player's film — the cross-link surface. */
  concepts: Array<{ slug: string; label: string; count: number }>;
};

/**
 * Slugs that earn a page. A player page with no film is thin content and
 * works against the search traffic the whole plan depends on, so film is the
 * gate — a Big Board slot alone is not enough.
 */
export async function getPublishedPlayerSlugs(): Promise<string[]> {
  const rows = await getDb()
    .selectDistinct({ slug: players.slug })
    .from(players)
    .innerJoin(videoPlayers, eq(videoPlayers.playerId, players.id))
    .innerJoin(videos, eq(videos.id, videoPlayers.videoId))
    .where(eq(videos.published, true));
  return rows.map((r) => r.slug);
}

export async function getPlayerPage(slug: string): Promise<PlayerPage | null> {
  const db = getDb();
  const [p] = await db.select().from(players).where(eq(players.slug, slug));
  if (!p) return null;

  const vids = await db
    .select({
      youtubeId: videos.youtubeId,
      slug: videos.slug,
      title: videos.title,
      headline: videos.headline,
      publishedAt: videos.publishedAt,
      durationSec: videos.durationSec,
      views: videos.views,
    })
    .from(videos)
    .innerJoin(videoPlayers, eq(videoPlayers.videoId, videos.id))
    .where(and(eq(videoPlayers.playerId, p.id), eq(videos.published, true)))
    .orderBy(desc(videos.publishedAt));

  // No film, no page.
  if (vids.length === 0) return null;

  const videoIds = await db
    .select({ id: videos.id })
    .from(videos)
    .innerJoin(videoPlayers, eq(videoPlayers.videoId, videos.id))
    .where(and(eq(videoPlayers.playerId, p.id), eq(videos.published, true)));

  const conceptRows =
    videoIds.length === 0
      ? []
      : await db
          .select({
            slug: concepts.slug,
            label: concepts.label,
            count: sql<number>`count(*)::int`,
          })
          .from(videoConcepts)
          .innerJoin(concepts, eq(videoConcepts.conceptId, concepts.id))
          .where(inArray(videoConcepts.videoId, videoIds.map((v) => v.id)))
          .groupBy(concepts.slug, concepts.label)
          .orderBy(desc(sql`count(*)`));

  return {
    player: {
      slug: p.slug,
      name: p.name,
      position: p.position,
      classYear: p.classYear,
      stars: p.stars,
      heightIn: p.heightIn,
      weightLb: p.weightLb,
      highSchool: p.highSchool,
      city: p.city,
      state: p.state,
      status: p.status,
      committedTo: p.committedTo,
      rosterYears: (p.rosterYears as number[]) ?? [],
      bio: p.bio,
    },
    videos: vids.map((v) => ({
      youtubeId: v.youtubeId,
      slug: v.slug,
      // The editorial headline is the SEO-facing title when set.
      title: v.headline ?? v.title,
      publishedAt: v.publishedAt,
      durationSec: v.durationSec,
      views: v.views,
      isShort: v.durationSec > 0 && v.durationSec <= SHORT_MAX_SECONDS,
    })),
    concepts: conceptRows,
  };
}

export type PlayerIndexEntry = {
  slug: string;
  name: string;
  position: Position;
  stars: number | null;
  videoCount: number;
  latestThumbnailId: string | null;
};

/** Every player with film, grouped-ready for the index page. */
export async function getPlayerIndex(): Promise<PlayerIndexEntry[]> {
  const db = getDb();
  const rows = await db
    .select({
      slug: players.slug,
      name: players.name,
      position: players.position,
      stars: players.stars,
      videoCount: sql<number>`count(${videos.id})::int`,
      latestThumbnailId: sql<string>`
        (select v2.youtube_id from videos v2
         join video_players vp2 on vp2.video_id = v2.id
         where vp2.player_id = ${players.id} and v2.published = true
         order by v2.published_at desc limit 1)
      `,
    })
    .from(players)
    .innerJoin(videoPlayers, eq(videoPlayers.playerId, players.id))
    .innerJoin(videos, eq(videos.id, videoPlayers.videoId))
    .where(eq(videos.published, true))
    .groupBy(players.id)
    .orderBy(desc(sql`count(${videos.id})`), players.name);
  return rows;
}


// ---------------------------------------------------------------------------
// Film pages — /film/[slug]
//
// Long-form only. A 30-second short with no written analysis is thin content
// and would dilute the pages that do earn their place, so shorts aggregate
// onto player and concept hubs instead (see hasFilmPage in lib/schema).
// ---------------------------------------------------------------------------
const LONG_FORM = gt(videos.durationSec, SHORT_MAX_SECONDS);

export type FilmPlayer = { slug: string; name: string; position: Position };

export type FilmPage = {
  youtubeId: string;
  slug: string;
  title: string;
  rawTitle: string;
  description: string;
  publishedAt: string;
  durationSec: number;
  views: number;
  analysis: string | null;
  keyMoments: Array<{ atSec: number; label: string }>;
  seriesName: string | null;
  players: FilmPlayer[];
  concepts: Array<{ slug: string; label: string }>;
  topics: string[];
  /** Other long-form films featuring any of the same players. */
  related: Array<{ slug: string; title: string; youtubeId: string }>;
};

export async function getFilmSlugs(): Promise<string[]> {
  const rows = await getDb()
    .select({ slug: videos.slug })
    .from(videos)
    .where(and(eq(videos.published, true), LONG_FORM));
  return rows.map((r) => r.slug);
}

export async function getFilmPage(slug: string): Promise<FilmPage | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(videos)
    .leftJoin(series, eq(videos.seriesId, series.id))
    .where(and(eq(videos.slug, slug), eq(videos.published, true), LONG_FORM));
  if (!row) return null;
  const v = row.videos;

  const [playerRows, conceptRows, topicRows] = await Promise.all([
    db
      .select({ slug: players.slug, name: players.name, position: players.position })
      .from(videoPlayers)
      .innerJoin(players, eq(videoPlayers.playerId, players.id))
      .where(eq(videoPlayers.videoId, v.id)),
    db
      .select({ slug: concepts.slug, label: concepts.label })
      .from(videoConcepts)
      .innerJoin(concepts, eq(videoConcepts.conceptId, concepts.id))
      .where(eq(videoConcepts.videoId, v.id)),
    db
      .select({ topic: videoTopics.topic })
      .from(videoTopics)
      .where(eq(videoTopics.videoId, v.id)),
  ]);

  // Related = other long-form films sharing a player. Internal linking is
  // most of the value of having these pages at all.
  let related: FilmPage["related"] = [];
  if (playerRows.length > 0) {
    const slugs = playerRows.map((p) => p.slug);
    const relatedRows = await db
      .selectDistinct({
        slug: videos.slug,
        title: videos.title,
        youtubeId: videos.youtubeId,
        // Postgres requires ORDER BY expressions to appear in the select list
        // of a SELECT DISTINCT. SQLite allowed it implicitly; this does not.
        publishedAt: videos.publishedAt,
      })
      .from(videos)
      .innerJoin(videoPlayers, eq(videoPlayers.videoId, videos.id))
      .innerJoin(players, eq(videoPlayers.playerId, players.id))
      .where(
        and(
          eq(videos.published, true),
          LONG_FORM,
          inArray(players.slug, slugs),
          ne(videos.id, v.id),
        ),
      )
      .orderBy(desc(videos.publishedAt))
      .limit(6);
    related = relatedRows.map(({ slug, title, youtubeId }) => ({
      slug,
      title,
      youtubeId,
    }));
  }

  return {
    youtubeId: v.youtubeId,
    slug: v.slug,
    title: v.headline ?? v.title,
    rawTitle: v.title,
    description: v.description,
    publishedAt: v.publishedAt,
    durationSec: v.durationSec,
    views: v.views,
    analysis: v.analysis,
    keyMoments: (v.keyMoments as Array<{ atSec: number; label: string }>) ?? [],
    seriesName: row.series?.name ?? null,
    players: playerRows,
    concepts: conceptRows,
    topics: topicRows.map((t) => t.topic),
    related,
  };
}

export type FilmIndexEntry = {
  slug: string;
  title: string;
  youtubeId: string;
  publishedAt: string;
  views: number;
  seriesName: string | null;
};

export async function getFilmIndex(): Promise<FilmIndexEntry[]> {
  const rows = await getDb()
    .select({
      slug: videos.slug,
      title: videos.title,
      headline: videos.headline,
      youtubeId: videos.youtubeId,
      publishedAt: videos.publishedAt,
      views: videos.views,
      seriesName: series.name,
    })
    .from(videos)
    .leftJoin(series, eq(videos.seriesId, series.id))
    .where(and(eq(videos.published, true), LONG_FORM))
    .orderBy(desc(videos.publishedAt));
  return rows.map((r) => ({
    slug: r.slug,
    title: r.headline ?? r.title,
    youtubeId: r.youtubeId,
    publishedAt: r.publishedAt,
    views: r.views,
    seriesName: r.seriesName,
  }));
}
