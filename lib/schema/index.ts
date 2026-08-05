/**
 * Shared content vocabulary for the Coach Hayes rebuild.
 *
 * OWNERSHIP: this module is store-agnostic on purpose. It owns the closed
 * vocabularies, derivation rules, and matching contract; whatever persistence
 * layer we use imports these rather than redeclaring them, so the store stays
 * a swappable detail.
 *
 * The zod schemas below are the INGEST contract: the pipeline validates
 * YouTube/CFBD data against them before persisting.
 *
 * TWO RULES CARRIED OVER FROM THE SANITY EVALUATION — both worth keeping in
 * whatever store we land on, because each closes a real bug:
 *
 *   1. FIELD OWNERSHIP must be structural, not conventional. Synced fields
 *      (from YouTube/CFBD) and editorial fields (headline, analysis) need
 *      enforced separation, or a re-sync silently destroys written work.
 *      In SQL: separate tables, or an explicit column-ownership guard in the
 *      upsert. Never a blanket UPDATE.
 *
 *   2. EXTERNAL IDS ARE CONTENT, not primary keys. youtubeId and cfbdId are
 *      upsert lookup keys stored as ordinary columns. Do not encode them into
 *      row identity — sources renumber, and relationships built on foreign IDs
 *      break when they do.
 *
 * DESIGN PRINCIPLE: minimise tagging friction.
 * Coach has 455 videos to backfill and ~3/week ongoing. Every required field
 * is a tax on that. So only TWO axes are ever tagged by hand — players and
 * concepts — and both are pre-filled by the auto-tagger. Everything else is
 * derived (see DERIVED RULES) or auto-matched from title keywords.
 *
 * THE ATOM is Video. Player / Concept / Series are documents because they own
 * a page and carry editorial copy. Position group and topic are closed enums
 * because they never need Coach to author anything.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------
export const SlugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be kebab-case");

export const YouTubeIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{11}$/, "must be an 11-character YouTube video ID");

export const POSITIONS = [
  "QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "ATH", "K", "P",
] as const;
export const PositionSchema = z.enum(POSITIONS);
export type Position = z.infer<typeof PositionSchema>;

/**
 * Position GROUPS are the hub pages (/positions/[group]). Distinct from
 * Position: a player HAS a position; a video is ABOUT a group. ATH/K/P don't
 * get hubs — too little content (verified: 0 videos each in the catalog scan).
 */
export const POSITION_GROUPS = [
  "QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB",
] as const;
export const PositionGroupSchema = z.enum(POSITION_GROUPS);
export type PositionGroup = z.infer<typeof PositionGroupSchema>;

/**
 * TOPICS — the non-scheme, non-position tag axis. Closed vocabulary,
 * auto-matched from title/description keywords by the lexicon in
 * scripts/concept-extraction.ts. Never hand-tagged.
 *
 * Deliberately ONE enum rather than three (game situation / calendar /
 * roster). They are heterogeneous in meaning but identical in behaviour —
 * each is a filter and a hub page — and splitting them would add tagging
 * friction and route prefixes for no reader benefit.
 *
 * Counts are verified catalog occurrences at time of design.
 */
export const TOPICS = [
  // game situation
  "red-zone",        //  4
  "third-down",      //  3
  "goal-line",       //  6
  "two-minute",      //  0 — reserved
  // calendar context
  "scrimmage",       // 17
  "spring-practice", // 12
  "offseason",       // 11
  "bowl-playoff",    // 22
  "signing-day",     //  0 — reserved
  // roster / recruiting
  "transfer-portal", // 71
  "commitments",     // 71
  "rankings",        //  2
  "nil",             // 15
  "depth-chart",     //  2
] as const;
export const TopicSchema = z.enum(TOPICS);
export type Topic = z.infer<typeof TopicSchema>;

export const CONCEPT_FAMILIES = [
  "run game",
  "pass game",
  "protection",
  "coverage",
  "front / pressure",
  "technique",
  "formation",
] as const;
export const ConceptFamilySchema = z.enum(CONCEPT_FAMILIES);
export type ConceptFamily = z.infer<typeof ConceptFamilySchema>;

/**
 * Full player lifecycle, not just recruiting. The catalog spans 2023-2026, so
 * many subjects (Brock Bowers, Carson Beck) are long gone to the NFL — their
 * pages still carry SEO value, but "target"/"offered" would be nonsense for
 * them. Ordered roughly by progression.
 */
export const PLAYER_STATUSES = [
  // recruiting
  "target", "offered", "visit", "committed", "signed", "decommit",
  "flip-watch", "off-board",
  // on roster
  "enrolled", "active", "redshirt", "injured",
  // departed
  "transfer-out", "graduated", "nfl",
] as const;
export const PlayerStatusSchema = z.enum(PLAYER_STATUSES);
export type PlayerStatus = z.infer<typeof PlayerStatusSchema>;

/** Long-form gets a /film/[slug] page; shorts only aggregate onto hubs. */
export const SHORT_MAX_SECONDS = 60;
export const FormatSchema = z.enum(["short", "long"]);
export type Format = z.infer<typeof FormatSchema>;

// ---------------------------------------------------------------------------
// Player — /players/[slug]   (~121 confirmed from long-form titles)
// ---------------------------------------------------------------------------
export const PlayerSchema = z.object({
  slug: SlugSchema,
  name: z.string().min(1),

  /**
   * Matcher input. The catalog contains genuine collisions (two J Thompson,
   * K/KJ Caldwell, MJ/M Knight) plus abbreviated forms Coach uses in titles.
   * Without aliases the auto-tagger cannot disambiguate these.
   */
  aliases: z.array(z.string().min(1)).default([]),

  position: PositionSchema,
  classYear: z.number().int().min(2020).max(2035).optional(),

  stars: z.number().int().min(0).max(5).nullable().default(null),
  nationalRank: z.number().int().positive().nullable().default(null),
  heightIn: z.number().int().min(60).max(90).nullable().default(null),
  weightLb: z.number().int().min(120).max(450).nullable().default(null),

  highSchool: z.string().min(1).nullable().default(null),
  city: z.string().min(1).nullable().default(null),
  state: z.string().min(2).max(2).nullable().default(null),

  status: PlayerStatusSchema,
  committedTo: z.string().min(1).nullable().default(null),

  /**
   * Upsert lookup key, stored as ordinary content — not row identity.
   * CFBD returns id as a STRING.
   */
  cfbdId: z.string().min(1).nullable().default(null),
  /** Roster seasons this player appeared in — CFBD has Georgia 2023-2025. */
  rosterYears: z.array(z.number().int().min(2020).max(2035)).default([]),

  bio: z.string().optional(),
  onBigBoard: z.boolean().default(false),
});
export type Player = z.infer<typeof PlayerSchema>;

// ---------------------------------------------------------------------------
// Concept — /playbook/[concept]   (24 tier-1 clusters)
// ---------------------------------------------------------------------------
export const ConceptSchema = z.object({
  slug: SlugSchema,
  label: z.string().min(1),
  family: ConceptFamilySchema,

  /**
   * Source patterns for the auto-tagger, carried over from
   * scripts/concept-extraction.ts. Stored as strings so they live in the CMS
   * and can be tuned without a deploy.
   */
  matchPatterns: z.array(z.string().min(1)).default([]),

  /** Optional. Concept pages work as pure aggregations with no copy at all. */
  explainer: z.string().optional(),
  relatedConcepts: z.array(SlugSchema).default([]),
});
export type Concept = z.infer<typeof ConceptSchema>;

// ---------------------------------------------------------------------------
// Series — /series/[slug]
// Verified: Film Work (94) · HazeBringer (52, archived) · Head On A
// Swivel (25) · Dawg Dispatch (20)
// ---------------------------------------------------------------------------
export const SeriesSchema = z.object({
  slug: SlugSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  /** Substring match against title for auto-assignment during ingest. */
  titlePattern: z.string().min(1).optional(),
  active: z.boolean().default(true),
});
export type Series = z.infer<typeof SeriesSchema>;

// ---------------------------------------------------------------------------
// Video — THE ATOM (455)
// ---------------------------------------------------------------------------
export const KeyMomentSchema = z.object({
  atSec: z.number().int().nonnegative(),
  label: z.string().min(1),
});

export const VideoSchema = z.object({
  // ---- ingested from YouTube, never hand-edited ----
  youtubeId: YouTubeIdSchema,
  slug: SlugSchema,
  title: z.string().min(1),
  description: z.string().default(""),
  publishedAt: z.string().datetime(),
  durationSec: z.number().int().nonnegative(),
  views: z.number().int().nonnegative().default(0),

  // ---- editorial, all optional ----
  /**
   * SEO title override. Catalog titles bury the entity behind brand suffixes
   * ("Carson Beck QB One! : HazeBringer Production"). This is where that gets
   * fixed without touching YouTube.
   */
  headline: z.string().min(1).optional(),
  analysis: z.string().optional(),
  keyMoments: z.array(KeyMomentSchema).default([]),

  // ---- the two hand-tagged axes (both auto-prefilled) ----
  players: z.array(SlugSchema).default([]),
  concepts: z.array(SlugSchema).default([]),

  // ---- auto-matched, rarely touched ----
  topics: z.array(TopicSchema).default([]),
  series: SlugSchema.nullable().default(null),
  /**
   * Override only. Normally DERIVED from players[] — see derivePositionGroups.
   * Set explicitly for room-level videos with no named player
   * ("Wide Receiver Room Bout to Break Out!").
   */
  positionGroupsOverride: z.array(PositionGroupSchema).default([]),

  // ---- provenance for the review queue ----
  autoTagged: z.boolean().default(false),
  tagConfidence: z.number().min(0).max(100).default(0),
  reviewedAt: z.string().datetime().nullable().default(null),
  published: z.boolean().default(false),
});
export type Video = z.infer<typeof VideoSchema>;

// ---------------------------------------------------------------------------
// DERIVED RULES
// Everything here is computed, never stored — so it can never drift.
// ---------------------------------------------------------------------------

/**
 * Duration 0 means YouTube reported no duration — in this catalog that is
 * exactly one livestream ("Chris Hayes Live Stream"). Treated as long-form so
 * it is never silently swept into the shorts bucket, but ingest should route
 * zero-duration items to the review queue rather than auto-publishing them.
 */
export function deriveFormat(durationSec: number): Format {
  return durationSec > 0 && durationSec <= SHORT_MAX_SECONDS ? "short" : "long";
}

export function hasUnknownDuration(durationSec: number): boolean {
  return durationSec <= 0;
}

/** Only long-form earns a /film/[slug] page. Shorts aggregate onto hubs. */
export function hasFilmPage(v: Pick<Video, "durationSec">): boolean {
  return deriveFormat(v.durationSec) === "long";
}

/**
 * Position groups come free from the players a video references — no tagging.
 * The override merges in for room-level videos with no named player.
 */
export function derivePositionGroups(
  video: Pick<Video, "players" | "positionGroupsOverride">,
  playersBySlug: ReadonlyMap<string, Pick<Player, "position">>,
): PositionGroup[] {
  const out = new Set<PositionGroup>(video.positionGroupsOverride);
  for (const slug of video.players) {
    const p = playersBySlug.get(slug);
    if (!p) continue;
    const parsed = PositionGroupSchema.safeParse(p.position);
    if (parsed.success) out.add(parsed.data);
  }
  return [...out];
}

/** Display title: editorial headline wins, YouTube title is the fallback. */
export function displayTitle(v: Pick<Video, "headline" | "title">): string {
  return v.headline ?? v.title;
}

// ---------------------------------------------------------------------------
// PLAYER SOURCING
//
// Players are SEEDED FROM THE CFBD ROSTER, never created from title
// extraction. Measured on this catalog, extracting names from titles runs at
// roughly 35% precision — it yields "Buck Sweep", "College Football", "Ready
// For" and "Stack Up" as people. CFBD returns 238 real Georgia players
// (2023-2025) with correct name, position, height, weight and hometown.
//
// So: roster is the INPUT, matching assigns videos to known players. The
// pipeline never invents a Player from a string.
// ---------------------------------------------------------------------------

/**
 * CFBD uses finer position codes than the site's groups. Unmapped codes return
 * null so the pipeline can flag rather than silently mis-bucket.
 */
const CFBD_POSITION_MAP: Record<string, Position> = {
  QB: "QB", RB: "RB", FB: "RB", WR: "WR", TE: "TE",
  OL: "OL", C: "OL", OG: "OL", OT: "OL", G: "OL", T: "OL",
  DL: "DL", DE: "DL", DT: "DL", NT: "DL", EDGE: "DL",
  LB: "LB", ILB: "LB", OLB: "LB", MLB: "LB",
  DB: "DB", CB: "DB", S: "DB", FS: "DB", SS: "DB",
  ATH: "ATH", K: "K", PK: "K", P: "P", LS: "OL",
};

export function normalizePosition(cfbdPosition: string | null | undefined) {
  if (!cfbdPosition) return null;
  return CFBD_POSITION_MAP[cfbdPosition.trim().toUpperCase()] ?? null;
}

/**
 * Surnames that are unusable as a match signal ON THIS CATALOG. Measured false
 * positives from a full roster-vs-catalog run:
 *
 *   hayes  → 221 hits. It is Coach's OWN name; every "Coach Hayes" title matches.
 *   short  → 78 hits, all from the "HazeBringer Short" series suffix.
 *   brock  → 12 hits; it is the FIRST name of Brock Bowers / Brock Vandagriff.
 *
 * Last-name-only matching stays below the auto-publish bar regardless, but
 * without this list the review queue drowns in ~300 false positives.
 */
export const SURNAME_STOPLIST: ReadonlySet<string> = new Set([
  "hayes", "short", "brock", "dispatch", "swivel", "cut", "film", "work",
]);

/** Surnames shared by 2+ roster players — require a first-name signal. */
export function findAmbiguousSurnames(
  players: ReadonlyArray<{ name: string }>,
): Set<string> {
  const counts = new Map<string, number>();
  for (const p of players) {
    const last = p.name.trim().split(/\s+/).pop()?.toLowerCase();
    if (!last) continue;
    counts.set(last, (counts.get(last) ?? 0) + 1);
  }
  return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([s]) => s));
}

/**
 * Thin pages hurt the SEO this whole plan rests on. 139 of 238 rostered
 * players are never named in the catalog — they must not become empty pages.
 */
export const MIN_VIDEOS_FOR_PLAYER_PAGE = 1;

export function shouldPublishPlayer(linkedVideoCount: number): boolean {
  return linkedVideoCount >= MIN_VIDEOS_FOR_PLAYER_PAGE;
}

// ---------------------------------------------------------------------------
// AUTO-TAGGING CONTRACT
// Thresholds carried over from scripts/match-youtube.ts, which already flags
// [NEEDS REVIEW] below 80.
// ---------------------------------------------------------------------------
export const AUTO_PUBLISH_CONFIDENCE = 80;

export type TagOutcome = "auto-published" | "needs-review" | "unmatched";

export function tagOutcome(confidence: number, hasAnyTag: boolean): TagOutcome {
  if (!hasAnyTag) return "unmatched";
  return confidence >= AUTO_PUBLISH_CONFIDENCE
    ? "auto-published"
    : "needs-review";
}

// ---------------------------------------------------------------------------
// EXTRACTION ROUTING
//
// scripts/concept-extraction.ts emits one flat list spanning three different
// destinations in this schema. The ingest pipeline must fan them out, or tags
// silently vanish. (A schema-fit run against the real catalog caught exactly
// this: 13 of 47 extracted tags had nowhere to land.)
// ---------------------------------------------------------------------------
export type TagDestination = "concept" | "topic" | "position-group";

const SCHEME_FAMILIES = new Set<string>(CONCEPT_FAMILIES);

export function tagDestination(extractionFamily: string): TagDestination {
  if (SCHEME_FAMILIES.has(extractionFamily)) return "concept";
  if (extractionFamily === "position group") return "position-group";
  return "topic"; // "situation" | "roster / recruiting"
}

/** Extraction slug → PositionGroup. Extraction uses long labels. */
const POSITION_GROUP_BY_SLUG: Record<string, PositionGroup> = {
  quarterback: "QB",
  "running-back": "RB",
  "wide-receiver": "WR",
  "tight-end": "TE",
  "offensive-line": "OL",
  "defensive-line": "DL",
  linebacker: "LB",
  "defensive-back": "DB",
};

export function positionGroupFromSlug(slug: string): PositionGroup | null {
  return POSITION_GROUP_BY_SLUG[slug] ?? null;
}

// ---------------------------------------------------------------------------
// ROUTE → QUERY MAP
// Every page in the design is one of these. No page needs data outside it.
// ---------------------------------------------------------------------------
export const ROUTE_QUERIES = {
  "/players/[slug]": "Player + videos where players contains slug",
  "/film/[slug]": "Video where slug and format === 'long'",
  "/playbook/[concept]": "Concept + videos where concepts contains slug",
  "/positions/[group]": "players where position === group + videos where derived groups contains group",
  "/series/[slug]": "Series + videos where series === slug",
  "/topics/[slug]": "videos where topics contains slug",
  "/big-board": "players where onBigBoard, grouped by position",
  "/": "latest published videos + recent board changes",
} as const;
