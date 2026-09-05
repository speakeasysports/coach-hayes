/**
 * ADMIN DATA-ACCESS CONTRACT — the handoff boundary between the two worktrees.
 *
 * This file is TYPES ONLY. It declares everything the admin UI needs from the
 * data layer and nothing about how that data is stored.
 *
 *   worktree-drizzle-migration  implements AdminRepository against Drizzle/libSQL
 *   main                        builds the admin UI against this interface
 *
 * Neither side blocks the other; integration is one import swap. A mock
 * implementation (lib/admin/mock.ts) lets the UI be built and reviewed before
 * the real one lands.
 *
 * RULES THIS CONTRACT ENCODES — all three closed real bugs earlier in design:
 *
 *   1. SYNCED vs EDITORIAL. Nothing here lets the UI write a synced field
 *      (title, description, duration, views). They are read-only in every view
 *      model. Sync owns them; a re-sync overwrites them.
 *
 *   2. AUTO-TAGGING RUNS ON INSERT ONLY. No method re-runs the tagger over an
 *      existing row. Re-tagging a reviewed video would silently undo Coach's
 *      corrections.
 *
 *   3. EXTERNAL IDS ARE NOT ROW IDENTITY. Mutations take VideoId/PlayerId (the
 *      store's own id). youtubeId and cfbdId are carried as data.
 *
 * Mutations throw on failure — idiomatic for Next server actions, which catch
 * and surface to the UI. They do not return error unions.
 */
import type { ImportPreview } from "@/lib/board/import";
import type {
  ConceptFamily,
  Format,
  Position,
  PositionGroup,
  PlayerStatus,
  Topic,
} from "@/lib/schema";

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------
/** Store-assigned ids. Opaque to the UI — never parsed or constructed. */
export type VideoId = string & { readonly __brand: "VideoId" };
export type PlayerId = string & { readonly __brand: "PlayerId" };
export type ConceptId = string & { readonly __brand: "ConceptId" };
export type SeriesId = string & { readonly __brand: "SeriesId" };

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------
/**
 * The three review buckets, sized against the real catalog:
 *   needs-tags  25  last-name match, unambiguous — confirm or correct
 *   ambiguous   13  surname maps to 2+ rostered players — must disambiguate
 *   unmatched  102  nothing matched; mostly low-intent motivational shorts.
 *                   Handled by BULK ARCHIVE, not per-item review.
 */
export type QueueBucket = "needs-tags" | "ambiguous" | "unmatched";

export type QueueCounts = Record<QueueBucket, number>;

/** A tag already applied to the video, with the confidence that produced it. */
export type AppliedPlayerTag = {
  playerId: PlayerId;
  name: string;
  position: Position;
  /** 0-100 from the matcher. 100 = confirmed by a human. */
  confidence: number;
};

/**
 * For the `ambiguous` bucket: a surname in the title maps to several rostered
 * players and the tagger deliberately applied none of them. Position and
 * roster years are what let Coach tell them apart.
 */
export type AmbiguityChoice = {
  /** The token in the title that was ambiguous, e.g. "smith". */
  surname: string;
  candidates: Array<{
    playerId: PlayerId;
    name: string;
    position: Position;
    rosterYears: number[];
    /** True when title initials favour this candidate — sort it first. */
    initialsMatch: boolean;
  }>;
};

export type QueueItem = {
  id: VideoId;
  youtubeId: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  durationSec: number;
  format: Format;
  /** Max matcher confidence across all tags; drives bucket assignment. */
  tagConfidence: number;

  players: AppliedPlayerTag[];
  concepts: Array<{ conceptId: ConceptId; label: string; family: ConceptFamily }>;
  topics: Topic[];
  series: { seriesId: SeriesId; name: string } | null;

  /** Populated only for the `ambiguous` bucket. */
  ambiguities: AmbiguityChoice[];
};

// ---------------------------------------------------------------------------
// Video edit
// ---------------------------------------------------------------------------
export type KeyMoment = { atSec: number; label: string };

/** Sync owns every field here. The UI renders them read-only. */
export type VideoSyncedFields = {
  youtubeId: string;
  title: string;
  description: string;
  publishedAt: string;
  durationSec: number;
  views: number;
  slug: string;
  /** Set when the video disappears from YouTube. Never hard-deleted. */
  missingSince: string | null;
};

/** Coach owns every field here. Sync never writes them. */
export type VideoEditorialFields = {
  headline: string | null;
  analysis: string | null;
  keyMoments: KeyMoment[];
};

export type VideoTagFields = {
  players: AppliedPlayerTag[];
  concepts: Array<{ conceptId: ConceptId; label: string; family: ConceptFamily }>;
  topics: Topic[];
  series: { seriesId: SeriesId; name: string } | null;
  /** Empty in the normal case — position groups derive from `players`. */
  positionGroupsOverride: PositionGroup[];
};

export type VideoDetail = {
  id: VideoId;
  synced: VideoSyncedFields;
  editorial: VideoEditorialFields;
  tags: VideoTagFields;
  published: boolean;
  reviewedAt: string | null;
  /** Derived from `players` — shown so Coach can see what the override changes. */
  derivedPositionGroups: PositionGroup[];
};

export type TagUpdate = {
  playerIds: PlayerId[];
  conceptIds: ConceptId[];
  topics: Topic[];
  seriesId: SeriesId | null;
  positionGroupsOverride: PositionGroup[];
};

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------
export type PlayerListItem = {
  id: PlayerId;
  name: string;
  position: Position;
  status: PlayerStatus;
  videoCount: number;
  onBigBoard: boolean;
  /**
   * Whether this player warrants a /players/[slug] page. Requires film --
   * a page with no video is thin and hurts the search traffic the whole
   * plan rests on. Board membership alone does NOT qualify: a recruit can
   * appear on the Big Board without having a player page.
   */
  hasPlayerPage: boolean;
};

export type PlayerListFilter = {
  /**
   * Defaults TRUE. Hides players with neither film nor a board slot -- the
   * ~139 rostered names that are never mentioned in a video.
   *
   * NOT the same as "has videos": a Big Board recruit legitimately has no
   * film (2027 prospects are hand-entered and often unbroken-down), and
   * filtering purely on video count made freshly imported recruits vanish.
   */
  relevantOnly?: boolean;
  position?: Position;
  status?: PlayerStatus;
  search?: string;
};

/** CFBD owns these. Read-only in the UI. */
export type PlayerSyncedFields = {
  cfbdId: string | null;
  rosterYears: number[];
  heightIn: number | null;
  weightLb: number | null;
  highSchool: string | null;
  city: string | null;
  state: string | null;
};

export type PlayerEditableFields = {
  status: PlayerStatus;
  onBigBoard: boolean;
  /** Highest-leverage field here — each alias permanently improves matching. */
  aliases: string[];
  bio: string | null;
  stars: number | null;
  classYear: number | null;
  committedTo: string | null;
};

export type PlayerDetail = {
  id: PlayerId;
  name: string;
  position: Position;
  slug: string;
  synced: PlayerSyncedFields;
  editable: PlayerEditableFields;
  videoCount: number;
};

// ---------------------------------------------------------------------------
// Sync + dashboard
// ---------------------------------------------------------------------------
export type SyncStatus = {
  lastSyncAt: string | null;
  state: "ok" | "failed" | "running" | "never-run";
  /** Present when state === "failed". Surfaced verbatim on the dashboard. */
  error: string | null;
  videosAdded: number;
  videosUpdated: number;
};

export type PublishedCounts = {
  videos: number;
  players: number;
  concepts: number;
  topics: number;
};

// ---------------------------------------------------------------------------
// Sheet import
//
// The sheet is an INPUT, not a live dependency. Coach drafts the board in
// Google Sheets, pulls it in, and the database stays authoritative from then
// on -- so admin edits survive and the board does not empty if the URL breaks.
// ---------------------------------------------------------------------------
export type ImportSource = {
  /** Published-to-web CSV URL. Null until Coach sets one. */
  url: string | null;
  lastImportedAt: string | null;
  lastResult: { created: number; updated: number } | null;
};

export type ImportResult = { created: number; updated: number };

// ---------------------------------------------------------------------------
// Pickers
// ---------------------------------------------------------------------------
export type PlayerOption = {
  id: PlayerId;
  name: string;
  position: Position;
  rosterYears: number[];
};
export type ConceptOption = {
  id: ConceptId;
  label: string;
  family: ConceptFamily;
};
export type SeriesOption = { id: SeriesId; name: string };

// ---------------------------------------------------------------------------
// The interface
// ---------------------------------------------------------------------------
export interface AdminRepository {
  // ---- dashboard --------------------------------------------------------
  getQueueCounts(): Promise<QueueCounts>;
  getSyncStatus(): Promise<SyncStatus>;
  getPublishedCounts(): Promise<PublishedCounts>;

  // ---- queue ------------------------------------------------------------
  /** Ordered oldest-first so the backfill drains predictably. */
  getQueueItems(
    bucket: QueueBucket,
    opts?: { limit?: number; offset?: number },
  ): Promise<QueueItem[]>;

  /**
   * Accept the currently-applied tags as correct: sets reviewedAt, sets
   * confidence to 100, publishes. Idempotent.
   */
  confirmVideo(id: VideoId): Promise<void>;

  /** Replace tags, then confirm. Used when Coach corrects before accepting. */
  saveVideoTags(id: VideoId, tags: TagUpdate): Promise<void>;

  /**
   * Bulk-dismiss. Marks reviewed and NOT published — the row and its tags
   * survive, so a later lexicon improvement can reconsider it. Never deletes.
   */
  archiveVideos(ids: VideoId[]): Promise<void>;

  /** Leave in the queue, move on. No state change beyond ordering. */
  skipVideo(id: VideoId): Promise<void>;

  // ---- video edit -------------------------------------------------------
  getVideo(id: VideoId): Promise<VideoDetail | null>;
  saveVideoEditorial(
    id: VideoId,
    fields: Partial<VideoEditorialFields>,
  ): Promise<void>;
  setVideoPublished(id: VideoId, published: boolean): Promise<void>;

  // ---- players ----------------------------------------------------------
  getPlayers(
    filter?: PlayerListFilter,
    opts?: { limit?: number; offset?: number },
  ): Promise<PlayerListItem[]>;
  getPlayer(id: PlayerId): Promise<PlayerDetail | null>;
  savePlayer(
    id: PlayerId,
    fields: Partial<PlayerEditableFields>,
  ): Promise<void>;

  // ---- pickers ----------------------------------------------------------
  searchPlayers(query: string, limit?: number): Promise<PlayerOption[]>;
  searchConcepts(query: string, limit?: number): Promise<ConceptOption[]>;
  listSeries(): Promise<SeriesOption[]>;

  // ---- sheet import -----------------------------------------------------
  getImportSource(): Promise<ImportSource>;
  setImportSource(url: string): Promise<void>;

  /**
   * Fetch + parse the sheet and describe what an apply WOULD do. Writes
   * nothing. Coach confirms before anything changes -- silently letting the
   * sheet overwrite admin edits is the same class of bug as a re-sync
   * clobbering written analysis.
   */
  previewSheetImport(url?: string): Promise<ImportPreview>;

  /**
   * Apply the creates and updates from a preview.
   *
   * `rowKeys` limits it to specific rows; omitted means every applicable row.
   * `expectedFingerprint` is the one carried by the preview Coach reviewed —
   * apply REFUSES if the sheet has changed since, rather than silently
   * writing content he never saw. Idempotent: applying twice yields the same
   * players.
   */
  applySheetImport(
    url: string,
    rowKeys?: string[],
    expectedFingerprint?: string,
  ): Promise<ImportResult>;

  // ---- sync -------------------------------------------------------------
  /**
   * Manual trigger for the same routine the daily job runs. Idempotent by
   * youtubeId. Rejects if a run is already in flight rather than racing it.
   */
  triggerSync(): Promise<SyncStatus>;
}
