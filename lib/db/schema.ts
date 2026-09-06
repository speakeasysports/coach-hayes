/**
 * Drizzle schema — the persistence layer under the shared vocabulary in
 * lib/schema. That module owns the enums, derivation rules, and matching
 * contract; this one owns how they land in Postgres. Keep domain rules THERE.
 *
 * The two rules from the Sanity evaluation, made structural:
 *
 *   1. FIELD OWNERSHIP — every synced column (YouTube/CFBD) is listed in
 *      lib/db/sync.ts, and the upsert helpers there build their UPDATE set
 *      from those lists. Editorial columns (headline, analysis, bio, tags a
 *      human added) are unreachable from a re-sync by construction.
 *
 *   2. EXTERNAL IDS ARE CONTENT — youtubeId / cfbdId are unique lookup
 *      columns, not row identity. All relationships go through internal
 *      integer PKs, so a source renumbering can never break a join.
 *
 * Tag links (video_players etc.) carry a `source` discriminator: 'auto' rows
 * are replaced wholesale on every re-tag pass; 'manual' rows are never touched
 * by the pipeline. Same ownership rule, applied to relationships.
 */
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
} from "drizzle-orm/pg-core";
import type {
  ConceptFamily,
  PlayerStatus,
  Position,
  PositionGroup,
  Topic,
} from "../schema";

export type LinkSource = "auto" | "manual";
type KeyMoment = { atSec: number; label: string };

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------
export const players = pgTable(
  "players",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),

    // synced from CFBD (see PLAYER_SYNCED_COLUMNS in sync.ts)
    name: text("name").notNull(),
    position: text("position").$type<Position>().notNull(),
    classYear: integer("class_year"),
    heightIn: integer("height_in"),
    weightLb: integer("weight_lb"),
    city: text("city"),
    state: text("state"),
    rosterYears: jsonb("roster_years")
      .$type<number[]>()
      .notNull()
      .default([]),
    /** Upsert lookup key, stored as ordinary content — not row identity. */
    cfbdId: text("cfbd_id").unique(),

    // editorial
    aliases: jsonb("aliases")
      .$type<string[]>()
      .notNull()
      .default([]),
    stars: integer("stars"),
    nationalRank: integer("national_rank"),
    highSchool: text("high_school"),
    status: text("status").$type<PlayerStatus>().notNull(),
    committedTo: text("committed_to"),
    bio: text("bio"),
    onBigBoard: boolean("on_big_board")
      .notNull()
      .default(false),
  },
  (t) => [index("players_position_idx").on(t.position)],
);

export const series = pgTable("series", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  /** Substring match against title for auto-assignment during ingest. */
  titlePattern: text("title_pattern"),
  active: boolean("active").notNull().default(true),
});

export const concepts = pgTable("concepts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  family: text("family").$type<ConceptFamily>().notNull(),
  /**
   * Regex sources (compiled case-insensitive by the tagger). Seeded from
   * lib/ingest/lexicon.ts; the DB copy is what the tagger actually runs, so
   * patterns can be tuned without a deploy.
   */
  matchPatterns: jsonb("match_patterns")
    .$type<string[]>()
    .notNull()
    .default([]),

  // editorial
  explainer: text("explainer"),
  relatedConcepts: jsonb("related_concepts")
    .$type<string[]>()
    .notNull()
    .default([]),
});

export const videos = pgTable(
  "videos",
  {
    id: serial("id").primaryKey(),
    /** Upsert lookup key, stored as ordinary content — not row identity. */
    youtubeId: text("youtube_id").notNull().unique(),
    slug: text("slug").notNull().unique(),

    // synced from YouTube (see VIDEO_SYNCED_COLUMNS in sync.ts)
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    publishedAt: text("published_at").notNull(), // ISO 8601
    durationSec: integer("duration_sec").notNull(),
    views: integer("views").notNull().default(0),

    // editorial
    headline: text("headline"),
    analysis: text("analysis"),
    /**
     * Companion Patreon post, when this video is a preview of one. A URL here
     * is what makes the video a "Patreon preview": there is no separate flag,
     * so the two can never disagree.
     *
     * Seeded on first insert from the description (see lib/patreon.ts) and
     * editorial from then on — it is absent from VIDEO_SYNCED_COLUMNS, so a
     * re-sync can never overwrite what Coach set.
     */
    patreonUrl: text("patreon_url"),
    keyMoments: jsonb("key_moments")
      .$type<KeyMoment[]>()
      .notNull()
      .default([]),

    seriesId: integer("series_id").references(() => series.id, {
      onDelete: "set null",
    }),

    // provenance for the review queue
    autoTagged: boolean("auto_tagged")
      .notNull()
      .default(false),
    tagConfidence: integer("tag_confidence").notNull().default(0),
    reviewedAt: text("reviewed_at"), // ISO 8601; non-null = human-owned
    published: boolean("published")
      .notNull()
      .default(false),
  },
  (t) => [
    index("videos_published_idx").on(t.published, t.publishedAt),
    index("videos_series_idx").on(t.seriesId),
  ],
);

// ---------------------------------------------------------------------------
// Tag links. Composite PKs; `source` marks pipeline vs human ownership.
// ---------------------------------------------------------------------------
export const videoPlayers = pgTable(
  "video_players",
  {
    videoId: integer("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    source: text("source").$type<LinkSource>().notNull().default("auto"),
    /** Matcher score (0-100) for 'auto' rows; null for 'manual'. */
    matchScore: integer("match_score"),
  },
  (t) => [
    primaryKey({ columns: [t.videoId, t.playerId] }),
    index("video_players_player_idx").on(t.playerId),
  ],
);

export const videoConcepts = pgTable(
  "video_concepts",
  {
    videoId: integer("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    conceptId: integer("concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    source: text("source").$type<LinkSource>().notNull().default("auto"),
  },
  (t) => [
    primaryKey({ columns: [t.videoId, t.conceptId] }),
    index("video_concepts_concept_idx").on(t.conceptId),
  ],
);

export const videoTopics = pgTable(
  "video_topics",
  {
    videoId: integer("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    /** Closed enum — validated against TopicSchema at the ingest boundary. */
    topic: text("topic").$type<Topic>().notNull(),
    source: text("source").$type<LinkSource>().notNull().default("auto"),
  },
  (t) => [
    primaryKey({ columns: [t.videoId, t.topic] }),
    index("video_topics_topic_idx").on(t.topic),
  ],
);

/**
 * Position-group OVERRIDES only (room-level videos with no named player).
 * The full group set for a video is derived at query time from its players
 * plus these rows — see derivePositionGroups in lib/schema.
 */
export const videoPositionOverrides = pgTable(
  "video_position_overrides",
  {
    videoId: integer("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    positionGroup: text("position_group").$type<PositionGroup>().notNull(),
    source: text("source").$type<LinkSource>().notNull().default("auto"),
  },
  (t) => [
    primaryKey({ columns: [t.videoId, t.positionGroup] }),
    index("video_position_overrides_group_idx").on(t.positionGroup),
  ],
);

export type PlayerRow = typeof players.$inferSelect;
export type VideoRow = typeof videos.$inferSelect;
export type ConceptRow = typeof concepts.$inferSelect;
export type SeriesRow = typeof series.$inferSelect;

/**
 * Editable page copy — headings, paragraphs and button labels on the public
 * pages. OVERRIDES ONLY: the registry of what is editable, and the default
 * text for each field, lives in lib/content/copy.ts. A key with no row here
 * renders the default that ships in the code.
 *
 * That split is deliberate. The JSX has to reference a key for it to render at
 * all, so the registry belongs next to the code that consumes it; and because
 * defaults are code, an empty table, a deleted row or a failed migration can
 * never blank out the homepage.
 */
export const pageContent = pgTable("page_content", {
  /** Registry key, e.g. "home.hero.headline". */
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * Small key/value store for admin state that has no natural home on a
 * content row: last sync outcome, the configured Sheets import URL.
 *
 * Deliberately a KV table rather than columns — these are singletons, and a
 * one-row settings table invites the "which row is live?" bug.
 */
export const adminMeta = pgTable("admin_meta", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});
