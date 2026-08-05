"use server";
/**
 * Review-queue mutations. Every action re-verifies the admin session —
 * server actions are reachable by direct POST, so the proxy redirect alone
 * is not authorization (see lib/admin/auth.ts).
 *
 * Approving or holding sets reviewedAt, which flips the video to human-owned:
 * the ingest pipeline will keep syncing its YouTube columns but will never
 * again touch its tags or publish state (see scripts/ingest.ts).
 */
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { ADMIN_COOKIE, isValidSession } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/client";
import {
  videoConcepts,
  videoPlayers,
  videoPositionOverrides,
  videos,
  videoTopics,
} from "@/lib/db/schema";

async function requireAdmin(): Promise<void> {
  const cookieStore = await cookies();
  if (!(await isValidSession(cookieStore.get(ADMIN_COOKIE)?.value))) {
    throw new Error("Unauthorized");
  }
}

function videoId(formData: FormData): number {
  const id = Number(formData.get("videoId"));
  if (!Number.isInteger(id) || id <= 0) throw new Error("bad videoId");
  return id;
}

export async function approveVideo(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = videoId(formData);
  await getDb()
    .update(videos)
    .set({ published: true, reviewedAt: new Date().toISOString() })
    .where(eq(videos.id, id));
  revalidatePath("/admin/review");
}

/** Keep it unpublished, but mark it reviewed so it leaves the queue. */
export async function holdVideo(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = videoId(formData);
  await getDb()
    .update(videos)
    .set({ published: false, reviewedAt: new Date().toISOString() })
    .where(eq(videos.id, id));
  revalidatePath("/admin/review");
}

/**
 * Drop one auto player link (a matcher false positive) and recompute the
 * video's confidence with the same policy as ingest: min of remaining auto
 * scores; 90 if only closed-vocabulary tags remain; 0 if nothing. The video
 * stays in the queue — dropping a bad link is a correction, not a sign-off.
 */
export async function dropPlayerLink(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = videoId(formData);
  const playerId = Number(formData.get("playerId"));
  if (!Number.isInteger(playerId) || playerId <= 0)
    throw new Error("bad playerId");

  const db = getDb();
  await db
    .delete(videoPlayers)
    .where(
      and(
        eq(videoPlayers.videoId, id),
        eq(videoPlayers.playerId, playerId),
        eq(videoPlayers.source, "auto"),
      ),
    );

  const [remaining] = await db
    .select({
      minScore: sql<number | null>`min(${videoPlayers.matchScore})`,
      n: sql<number>`count(*)`,
    })
    .from(videoPlayers)
    .where(eq(videoPlayers.videoId, id));
  const [otherTags] = await db
    .select({
      n: sql<number>`
        (select count(*) from ${videoConcepts} where ${videoConcepts.videoId} = ${id})
      + (select count(*) from ${videoTopics} where ${videoTopics.videoId} = ${id})
      + (select count(*) from ${videoPositionOverrides} where ${videoPositionOverrides.videoId} = ${id})`,
    })
    .from(videos)
    .where(eq(videos.id, id));

  const confidence =
    remaining.n > 0 ? (remaining.minScore ?? 90) : otherTags.n > 0 ? 90 : 0;
  await db
    .update(videos)
    .set({ tagConfidence: confidence })
    .where(eq(videos.id, id));
  revalidatePath("/admin/review");
}
