/**
 * The column-ownership guard (rule 1 in lib/schema and lib/db/schema.ts).
 *
 * Everything a re-sync is allowed to touch is enumerated HERE, and the upsert
 * helpers derive their conflict-UPDATE set from these lists. There is no
 * blanket UPDATE anywhere in the pipeline; adding a column to a sync requires
 * adding it to a list in this file, which is the review point.
 *
 * Slugs are deliberately NOT synced: they are route identity, minted once at
 * first insert. A retitled YouTube video keeps its URL.
 */
import { sql, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { getTableColumns } from "drizzle-orm";
import type { Db } from "./client";
import { concepts, players, series, videos } from "./schema";

export const VIDEO_SYNCED_COLUMNS = [
  "title",
  "description",
  "publishedAt",
  "durationSec",
  "views",
] as const satisfies ReadonlyArray<keyof typeof videos.$inferInsert>;

export const PLAYER_SYNCED_COLUMNS = [
  "name",
  "position",
  "classYear",
  "heightIn",
  "weightLb",
  "city",
  "state",
  "rosterYears",
] as const satisfies ReadonlyArray<keyof typeof players.$inferInsert>;

export const CONCEPT_SYNCED_COLUMNS = [
  "label",
  "family",
  "matchPatterns",
] as const satisfies ReadonlyArray<keyof typeof concepts.$inferInsert>;

export const SERIES_SYNCED_COLUMNS = [
  "name",
  "titlePattern",
] as const satisfies ReadonlyArray<keyof typeof series.$inferInsert>;

/**
 * `excluded.<col>` refs for ON CONFLICT DO UPDATE, from a synced-column list.
 * Columns the caller didn't provide are left out of the UPDATE too — an
 * absent optional field must not null out a value someone set editorially.
 */
function excludedSet<T extends PgTable>(
  table: T,
  cols: ReadonlyArray<string>,
  row: Record<string, unknown>,
): Record<string, SQL> {
  const all = getTableColumns(table);
  const set: Record<string, SQL> = {};
  for (const key of cols) {
    if (row[key] === undefined) continue;
    const col = all[key as keyof typeof all];
    if (!col) throw new Error(`unknown column in synced list: ${key}`);
    set[key] = sql.raw(`excluded."${col.name}"`);
  }
  return set;
}

export type VideoSyncInput = {
  youtubeId: string;
  slug: string;
  /**
   * Seed value: written on first insert, editorial afterwards — the same deal
   * `status` and `aliases` get on players. Ingest extracts it from the video
   * description; Coach owns it once the row exists.
   */
  patreonUrl?: string | null;
} & Pick<
  typeof videos.$inferInsert,
  (typeof VIDEO_SYNCED_COLUMNS)[number]
>;

/**
 * Insert-or-update by youtubeId, updating ONLY the synced columns. Editorial
 * fields, tags, provenance, and slug are untouchable from this path.
 */
export async function upsertVideoFromYouTube(
  db: Db,
  row: VideoSyncInput,
): Promise<{ id: number }> {
  const [r] = await db
    .insert(videos)
    .values(row)
    .onConflictDoUpdate({
      target: videos.youtubeId,
      set: excludedSet(videos, VIDEO_SYNCED_COLUMNS, row),
    })
    .returning({ id: videos.id });
  return r;
}

export type PlayerSyncInput = {
  cfbdId: string;
  slug: string;
  status: (typeof players.$inferInsert)["status"];
  aliases?: string[];
} & Pick<
  typeof players.$inferInsert,
  (typeof PLAYER_SYNCED_COLUMNS)[number]
>;

/**
 * Insert-or-update by cfbdId, updating ONLY the synced columns. status and
 * aliases are seed values: written on first insert, editorial afterwards.
 */
export async function upsertPlayerFromCfbd(
  db: Db,
  row: PlayerSyncInput,
): Promise<{ id: number }> {
  const [r] = await db
    .insert(players)
    .values(row)
    .onConflictDoUpdate({
      target: players.cfbdId,
      set: excludedSet(players, PLAYER_SYNCED_COLUMNS, row),
    })
    .returning({ id: players.id });
  return r;
}

export type ConceptSeedInput = { slug: string } & Pick<
  typeof concepts.$inferInsert,
  (typeof CONCEPT_SYNCED_COLUMNS)[number]
>;

/** Upsert by slug; explainer / relatedConcepts stay editorial. */
export async function upsertConceptFromLexicon(
  db: Db,
  row: ConceptSeedInput,
): Promise<{ id: number }> {
  const [r] = await db
    .insert(concepts)
    .values(row)
    .onConflictDoUpdate({
      target: concepts.slug,
      set: excludedSet(concepts, CONCEPT_SYNCED_COLUMNS, row),
    })
    .returning({ id: concepts.id });
  return r;
}

export type SeriesSeedInput = { slug: string; active?: boolean } & Pick<
  typeof series.$inferInsert,
  (typeof SERIES_SYNCED_COLUMNS)[number]
>;

/** Upsert by slug; description stays editorial, active is a seed value. */
export async function upsertSeriesSeed(
  db: Db,
  row: SeriesSeedInput,
): Promise<{ id: number }> {
  const [r] = await db
    .insert(series)
    .values(row)
    .onConflictDoUpdate({
      target: series.slug,
      set: excludedSet(series, SERIES_SYNCED_COLUMNS, row),
    })
    .returning({ id: series.id });
  return r;
}
