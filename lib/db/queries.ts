/**
 * Read-side queries over the Drizzle store. Server components call these
 * directly (no fetch layer — see Next.js docs on ORM access from RSCs).
 */
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "./client";
import {
  concepts,
  players,
  series,
  videoConcepts,
  videoPlayers,
  videoPositionOverrides,
  videos,
  videoTopics,
  type LinkSource,
} from "./schema";

export type ReviewQueueItem = {
  id: number;
  youtubeId: string;
  title: string;
  publishedAt: string;
  durationSec: number;
  views: number;
  tagConfidence: number;
  seriesName: string | null;
  players: Array<{
    playerId: number;
    name: string;
    position: string;
    score: number | null;
    source: LinkSource;
  }>;
  concepts: string[];
  topics: string[];
  positionGroups: string[];
};

/** needs-review = auto-tagged, unpublished, no human sign-off yet. */
const REVIEW_QUEUE_WHERE = and(
  eq(videos.autoTagged, true),
  eq(videos.published, false),
  isNull(videos.reviewedAt),
);

export async function getReviewQueueCount(): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(videos)
    .where(REVIEW_QUEUE_WHERE);
  return row.n;
}

export async function getReviewQueue(
  page: number,
  perPage: number,
): Promise<ReviewQueueItem[]> {
  const db = getDb();

  // Highest-confidence first: those are one-glance approvals.
  const base = await db
    .select({
      id: videos.id,
      youtubeId: videos.youtubeId,
      title: videos.title,
      publishedAt: videos.publishedAt,
      durationSec: videos.durationSec,
      views: videos.views,
      tagConfidence: videos.tagConfidence,
      seriesName: series.name,
    })
    .from(videos)
    .leftJoin(series, eq(videos.seriesId, series.id))
    .where(REVIEW_QUEUE_WHERE)
    .orderBy(desc(videos.tagConfidence), desc(videos.publishedAt))
    .limit(perPage)
    .offset((page - 1) * perPage);

  if (base.length === 0) return [];
  const ids = base.map((v) => v.id);

  const [playerRows, conceptRows, topicRows, groupRows] = await Promise.all([
    getDb()
      .select({
        videoId: videoPlayers.videoId,
        playerId: videoPlayers.playerId,
        name: players.name,
        position: players.position,
        score: videoPlayers.matchScore,
        source: videoPlayers.source,
      })
      .from(videoPlayers)
      .innerJoin(players, eq(videoPlayers.playerId, players.id))
      .where(inArray(videoPlayers.videoId, ids)),
    getDb()
      .select({
        videoId: videoConcepts.videoId,
        label: concepts.label,
      })
      .from(videoConcepts)
      .innerJoin(concepts, eq(videoConcepts.conceptId, concepts.id))
      .where(inArray(videoConcepts.videoId, ids)),
    getDb()
      .select({ videoId: videoTopics.videoId, topic: videoTopics.topic })
      .from(videoTopics)
      .where(inArray(videoTopics.videoId, ids)),
    getDb()
      .select({
        videoId: videoPositionOverrides.videoId,
        group: videoPositionOverrides.positionGroup,
      })
      .from(videoPositionOverrides)
      .where(inArray(videoPositionOverrides.videoId, ids)),
  ]);

  return base.map((v) => ({
    ...v,
    players: playerRows
      .filter((r) => r.videoId === v.id)
      .map((r) => ({
        playerId: r.playerId,
        name: r.name,
        position: r.position,
        score: r.score,
        source: r.source,
      }))
      .sort((a, b) => (b.score ?? 101) - (a.score ?? 101)),
    concepts: conceptRows.filter((r) => r.videoId === v.id).map((r) => r.label),
    topics: topicRows.filter((r) => r.videoId === v.id).map((r) => r.topic),
    positionGroups: groupRows
      .filter((r) => r.videoId === v.id)
      .map((r) => r.group),
  }));
}
