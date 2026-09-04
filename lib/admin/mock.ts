/**
 * In-memory AdminRepository for building the UI before Drizzle lands.
 *
 * Fixtures mirror the real catalog's shape and proportions so the UI is
 * exercised against realistic data rather than three tidy rows:
 *   - the ambiguous bucket contains a genuine six-way surname collision
 *   - the unmatched bucket contains the real HazeBringer motivational shorts
 *   - players include ones with zero videos (unpublishable)
 *
 * State is module-level and resets on server restart. That is deliberate —
 * it makes mutations visibly work without pretending to be a database.
 */
import type {
  AdminRepository,
  AmbiguityChoice,
  ConceptId,
  ConceptOption,
  PlayerDetail,
  PlayerId,
  PlayerListFilter,
  PlayerListItem,
  PlayerOption,
  PublishedCounts,
  QueueBucket,
  QueueCounts,
  QueueItem,
  SeriesId,
  SeriesOption,
  SyncStatus,
  TagUpdate,
  VideoDetail,
  VideoEditorialFields,
  VideoId,
} from "./contract";
import { derivePositionGroups, type Position, type PositionGroup } from "@/lib/schema";

const vid = (s: string) => s as VideoId;
const pid = (s: string) => s as PlayerId;
const cid = (s: string) => s as ConceptId;
const sid = (s: string) => s as SeriesId;

type MockPlayer = {
  id: PlayerId;
  name: string;
  position: Position;
  slug: string;
  rosterYears: number[];
  status: PlayerDetail["editable"]["status"];
  onBigBoard: boolean;
  aliases: string[];
  bio: string | null;
  stars: number | null;
  classYear: number | null;
  committedTo: string | null;
  cfbdId: string | null;
  heightIn: number | null;
  weightLb: number | null;
  highSchool: string | null;
  city: string | null;
  state: string | null;
};

const PLAYERS: MockPlayer[] = [
  p("carson-beck", "Carson Beck", "QB", [2023, 2024], "nfl", ["C Beck"], 76, 220),
  p("gunner-stockton", "Gunner Stockton", "QB", [2023, 2024, 2025], "active", [], 73, 215),
  p("cj-smith", "C.J. Smith", "WR", [2023, 2024, 2025], "active", ["C. J. Smith", "CJ"], 73, 190),
  p("arian-smith", "Arian Smith", "WR", [2023, 2024], "nfl", [], 71, 180),
  p("tykee-smith", "Tykee Smith", "DB", [2023, 2024], "nfl", [], 70, 195),
  p("colby-smith", "Colby Smith", "DB", [2025], "active", [], 72, 185),
  p("cortez-smith", "Cortez Smith", "OL", [2025], "active", [], 77, 300),
  p("darris-smith", "Darris Smith", "DL", [2023], "transfer-out", [], 77, 240),
  p("oscar-delp", "Oscar Delp", "TE", [2023, 2024, 2025], "active", ["Delp"], 76, 245),
  p("brock-bowers", "Brock Bowers", "TE", [2023], "nfl", [], 75, 243),
  p("jalon-walker", "Jalon Walker", "LB", [2023, 2024], "nfl", [], 74, 245),
  p("malaki-starks", "Malaki Starks", "DB", [2023, 2024], "nfl", [], 73, 205),
  p("daijun-edwards", "Daijun Edwards", "RB", [2023], "nfl", [], 70, 205),
  p("nate-frazier", "Nate Frazier", "RB", [2024, 2025], "active", [], 71, 200),
  // zero-video players — must be filtered out of the default list
  p("izayah-reeves", "Izayah Reeves", "WR", [2023], "transfer-out", [], 71, 175),
  p("marques-easley", "Marques Easley", "OL", [2025], "active", [], 78, 310),
];

function p(
  slug: string,
  name: string,
  position: Position,
  rosterYears: number[],
  status: MockPlayer["status"],
  aliases: string[],
  heightIn: number,
  weightLb: number,
): MockPlayer {
  return {
    id: pid(slug),
    name,
    position,
    slug,
    rosterYears,
    status,
    onBigBoard: false,
    aliases,
    bio: null,
    stars: null,
    classYear: null,
    committedTo: "Georgia",
    cfbdId: `cfbd-${slug}`,
    heightIn,
    weightLb,
    highSchool: null,
    city: null,
    state: null,
  };
}

const CONCEPTS: ConceptOption[] = [
  { id: cid("zone-blocking"), label: "Zone Blocking", family: "run game" },
  { id: cid("zone-fits"), label: "Zone Fits", family: "run game" },
  { id: cid("gap-scheme"), label: "Gap Scheme", family: "run game" },
  { id: cid("counter-trey"), label: "Counter Trey", family: "run game" },
  { id: cid("buck-sweep"), label: "Buck Sweep", family: "run game" },
  { id: cid("split-zone"), label: "Split Zone", family: "run game" },
  { id: cid("play-action"), label: "Play Action", family: "pass game" },
  { id: cid("screen"), label: "Screen Game", family: "pass game" },
  { id: cid("pass-protection"), label: "Pass Protection", family: "protection" },
  { id: cid("bracket"), label: "Bracket", family: "coverage" },
  { id: cid("match-zone"), label: "Match Zone", family: "coverage" },
];

const SERIES: SeriesOption[] = [
  { id: sid("film-work"), name: "UGA Film Work" },
  { id: sid("head-on-a-swivel"), name: "Head On A Swivel" },
  { id: sid("dawg-dispatch"), name: "Dawg Dispatch" },
  { id: sid("hazebringer"), name: "HazeBringer (archived)" },
];

type MockVideo = {
  id: VideoId;
  youtubeId: string;
  title: string;
  description: string;
  publishedAt: string;
  durationSec: number;
  views: number;
  slug: string;
  headline: string | null;
  analysis: string | null;
  keyMoments: { atSec: number; label: string }[];
  playerIds: PlayerId[];
  conceptIds: ConceptId[];
  topics: VideoDetail["tags"]["topics"];
  seriesId: SeriesId | null;
  positionGroupsOverride: PositionGroup[];
  tagConfidence: number;
  bucket: QueueBucket | null;
  ambiguities: AmbiguityChoice[];
  published: boolean;
  reviewedAt: string | null;
  missingSince: string | null;
};

const smithCandidates = (surname: string): AmbiguityChoice => ({
  surname,
  candidates: PLAYERS.filter(
    (x) => x.name.toLowerCase().endsWith(` ${surname}`),
  ).map((x) => ({
    playerId: x.id,
    name: x.name,
    position: x.position,
    rosterYears: x.rosterYears,
    initialsMatch: x.id === pid("cj-smith"),
  })),
});

let VIDEOS: MockVideo[] = [
  v({
    id: "v-delp-pistol",
    youtubeId: "YrxJFsSFexk",
    title: "UGA Film Work: Pistol Playaction To Delp",
    publishedAt: "2024-10-12T14:00:00.000Z",
    durationSec: 512,
    views: 1840,
    playerIds: [pid("oscar-delp")],
    conceptIds: [cid("play-action")],
    seriesId: sid("film-work"),
    tagConfidence: 70,
    bucket: "needs-tags",
  }),
  v({
    id: "v-zone-fits",
    youtubeId: "NGjYrww_D-A",
    title: "Zone Run Fits: Young Bucks-HazeBringer Shorts",
    publishedAt: "2023-09-02T14:00:00.000Z",
    durationSec: 48,
    views: 4102,
    conceptIds: [cid("zone-fits"), cid("zone-blocking")],
    seriesId: sid("hazebringer"),
    tagConfidence: 72,
    bucket: "needs-tags",
  }),
  v({
    id: "v-frazier-gap",
    youtubeId: "SnV2JnZJjoM",
    title: "Nate Frazier vs Gap Scheme: Reading the Pull",
    publishedAt: "2025-10-04T14:00:00.000Z",
    durationSec: 44,
    views: 903,
    playerIds: [pid("nate-frazier")],
    conceptIds: [cid("gap-scheme")],
    seriesId: sid("film-work"),
    tagConfidence: 74,
    bucket: "needs-tags",
  }),
  v({
    id: "v-cj-smith",
    youtubeId: "dQw4w9WgXcQ",
    title: "UGA Short Film Work:  More C. J.  Smith Please",
    publishedAt: "2025-03-11T14:00:00.000Z",
    durationSec: 51,
    views: 612,
    tagConfidence: 0,
    bucket: "ambiguous",
    ambiguities: [smithCandidates("smith")],
  }),
  v({
    id: "v-delp-mims",
    youtubeId: "jNQXAC9IVRw",
    title: "UGA Short Film Work: Watch Delp & Mims Eat!",
    publishedAt: "2024-11-02T14:00:00.000Z",
    durationSec: 55,
    views: 1120,
    tagConfidence: 0,
    bucket: "ambiguous",
    ambiguities: [smithCandidates("smith")],
  }),
  v({
    id: "v-trust-process",
    youtubeId: "aaaaaaaaaa1",
    title: "Trust the Process: HazeBringer Short",
    publishedAt: "2023-07-18T14:00:00.000Z",
    durationSec: 32,
    views: 380,
    seriesId: sid("hazebringer"),
    tagConfidence: 0,
    bucket: "unmatched",
  }),
  v({
    id: "v-game-inches-1",
    youtubeId: "aaaaaaaaaa2",
    title: "Game Of Inches Part One: HazeBringer Short",
    publishedAt: "2023-07-20T14:00:00.000Z",
    durationSec: 29,
    views: 296,
    seriesId: sid("hazebringer"),
    tagConfidence: 0,
    bucket: "unmatched",
  }),
  v({
    id: "v-game-inches-2",
    youtubeId: "aaaaaaaaaa3",
    title: "Game of Inches Part Two: HazeBringer Short",
    publishedAt: "2023-07-21T14:00:00.000Z",
    durationSec: 31,
    views: 271,
    seriesId: sid("hazebringer"),
    tagConfidence: 0,
    bucket: "unmatched",
  }),
  v({
    id: "v-feeling-good",
    youtubeId: "aaaaaaaaaa4",
    title: "UGA Feeling Good: HazeBringer Short",
    publishedAt: "2023-08-01T14:00:00.000Z",
    durationSec: 27,
    views: 410,
    seriesId: sid("hazebringer"),
    tagConfidence: 0,
    bucket: "unmatched",
  }),
  // already live — appears in counts, not the queue
  v({
    id: "v-beck-qb1",
    youtubeId: "bbbbbbbbbb1",
    title: "Carson Beck QB One! : HazeBringer Production",
    headline: "Carson Beck: Reading the Backside Safety",
    publishedAt: "2024-02-14T14:00:00.000Z",
    durationSec: 640,
    views: 5210,
    playerIds: [pid("carson-beck")],
    conceptIds: [cid("play-action")],
    seriesId: sid("film-work"),
    tagConfidence: 100,
    bucket: null,
    published: true,
    reviewedAt: "2024-02-15T09:00:00.000Z",
  }),
];

type VideoSeed = Omit<Partial<MockVideo>, "id"> & {
  id: string;
  youtubeId: string;
  title: string;
};

function v(o: VideoSeed): MockVideo {
  return {
    description: "",
    publishedAt: new Date().toISOString(),
    durationSec: 60,
    views: 0,
    slug: o.id,
    headline: null,
    analysis: null,
    keyMoments: [],
    playerIds: [],
    conceptIds: [],
    topics: [],
    seriesId: null,
    positionGroupsOverride: [],
    tagConfidence: 0,
    bucket: null,
    ambiguities: [],
    published: false,
    reviewedAt: null,
    missingSince: null,
    ...o,
    id: vid(o.id),
  };
}

let syncStatus: SyncStatus = {
  lastSyncAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  state: "ok",
  error: null,
  videosAdded: 3,
  videosUpdated: 452,
};

// ---------------------------------------------------------------------------
const byId = (id: VideoId) => VIDEOS.find((x) => x.id === id);
const playerById = (id: PlayerId) => PLAYERS.find((x) => x.id === id);
const conceptById = (id: ConceptId) => CONCEPTS.find((x) => x.id === id);
const seriesById = (id: SeriesId) => SERIES.find((x) => x.id === id);

function videoCount(playerId: PlayerId): number {
  return VIDEOS.filter((x) => x.playerIds.includes(playerId)).length;
}

function toQueueItem(m: MockVideo): QueueItem {
  return {
    id: m.id,
    youtubeId: m.youtubeId,
    title: m.title,
    thumbnailUrl: `https://i.ytimg.com/vi/${m.youtubeId}/hqdefault.jpg`,
    publishedAt: m.publishedAt,
    durationSec: m.durationSec,
    format: m.durationSec > 0 && m.durationSec <= 60 ? "short" : "long",
    tagConfidence: m.tagConfidence,
    players: m.playerIds.map((id) => {
      const pl = playerById(id)!;
      return { playerId: id, name: pl.name, position: pl.position, confidence: m.tagConfidence };
    }),
    concepts: m.conceptIds.map((id) => {
      const c = conceptById(id)!;
      return { conceptId: id, label: c.label, family: c.family };
    }),
    topics: m.topics,
    series: m.seriesId ? { seriesId: m.seriesId, name: seriesById(m.seriesId)!.name } : null,
    ambiguities: m.ambiguities,
  };
}

export const mockRepo: AdminRepository = {
  async getQueueCounts(): Promise<QueueCounts> {
    const c: QueueCounts = { "needs-tags": 0, ambiguous: 0, unmatched: 0 };
    for (const m of VIDEOS) if (m.bucket) c[m.bucket]++;
    return c;
  },

  async getSyncStatus() {
    return syncStatus;
  },

  async getPublishedCounts(): Promise<PublishedCounts> {
    return {
      videos: VIDEOS.filter((x) => x.published).length,
      players: PLAYERS.filter((x) => videoCount(x.id) > 0).length,
      concepts: CONCEPTS.length,
      topics: 12,
    };
  },

  async getQueueItems(bucket, opts) {
    const rows = VIDEOS.filter((x) => x.bucket === bucket).sort((a, b) =>
      a.publishedAt.localeCompare(b.publishedAt),
    );
    const off = opts?.offset ?? 0;
    return rows.slice(off, off + (opts?.limit ?? rows.length)).map(toQueueItem);
  },

  async confirmVideo(id) {
    const m = byId(id);
    if (!m) throw new Error(`Video not found: ${id}`);
    m.bucket = null;
    m.tagConfidence = 100;
    m.published = true;
    m.reviewedAt = new Date().toISOString();
  },

  async saveVideoTags(id: VideoId, tags: TagUpdate) {
    const m = byId(id);
    if (!m) throw new Error(`Video not found: ${id}`);
    m.playerIds = tags.playerIds;
    m.conceptIds = tags.conceptIds;
    m.topics = tags.topics;
    m.seriesId = tags.seriesId;
    m.positionGroupsOverride = tags.positionGroupsOverride;
    m.ambiguities = [];
    m.bucket = null;
    m.tagConfidence = 100;
    m.published = true;
    m.reviewedAt = new Date().toISOString();
  },

  async archiveVideos(ids) {
    for (const id of ids) {
      const m = byId(id);
      if (!m) continue;
      // Reviewed but NOT published. Row and tags survive.
      m.bucket = null;
      m.published = false;
      m.reviewedAt = new Date().toISOString();
    }
  },

  async skipVideo() {
    // No state change — ordering only.
  },

  async getVideo(id): Promise<VideoDetail | null> {
    const m = byId(id);
    if (!m) return null;
    const roster = new Map(PLAYERS.map((x) => [String(x.id), { position: x.position }]));
    return {
      id: m.id,
      synced: {
        youtubeId: m.youtubeId,
        title: m.title,
        description: m.description,
        publishedAt: m.publishedAt,
        durationSec: m.durationSec,
        views: m.views,
        slug: m.slug,
        missingSince: m.missingSince,
      },
      editorial: {
        headline: m.headline,
        analysis: m.analysis,
        keyMoments: m.keyMoments,
      },
      tags: {
        players: toQueueItem(m).players,
        concepts: toQueueItem(m).concepts,
        topics: m.topics,
        series: m.seriesId ? { seriesId: m.seriesId, name: seriesById(m.seriesId)!.name } : null,
        positionGroupsOverride: m.positionGroupsOverride,
      },
      published: m.published,
      reviewedAt: m.reviewedAt,
      derivedPositionGroups: derivePositionGroups(
        { players: m.playerIds.map(String), positionGroupsOverride: m.positionGroupsOverride },
        roster,
      ),
    };
  },

  async saveVideoEditorial(id: VideoId, fields: Partial<VideoEditorialFields>) {
    const m = byId(id);
    if (!m) throw new Error(`Video not found: ${id}`);
    if (fields.headline !== undefined) m.headline = fields.headline;
    if (fields.analysis !== undefined) m.analysis = fields.analysis;
    if (fields.keyMoments !== undefined) m.keyMoments = fields.keyMoments;
  },

  async setVideoPublished(id, published) {
    const m = byId(id);
    if (!m) throw new Error(`Video not found: ${id}`);
    m.published = published;
  },

  async getPlayers(filter?: PlayerListFilter, opts?): Promise<PlayerListItem[]> {
    const hasVideos = filter?.hasVideos ?? true;
    const q = filter?.search?.toLowerCase().trim();
    let rows = PLAYERS.map((x) => {
      const n = videoCount(x.id);
      return {
        id: x.id,
        name: x.name,
        position: x.position,
        status: x.status,
        videoCount: n,
        onBigBoard: x.onBigBoard,
        isPublishable: n > 0,
      } satisfies PlayerListItem;
    });
    if (hasVideos) rows = rows.filter((r) => r.videoCount > 0);
    if (filter?.position) rows = rows.filter((r) => r.position === filter.position);
    if (filter?.status) rows = rows.filter((r) => r.status === filter.status);
    if (q) rows = rows.filter((r) => r.name.toLowerCase().includes(q));
    rows.sort((a, b) => b.videoCount - a.videoCount || a.name.localeCompare(b.name));
    const off = opts?.offset ?? 0;
    return rows.slice(off, off + (opts?.limit ?? rows.length));
  },

  async getPlayer(id): Promise<PlayerDetail | null> {
    const x = playerById(id);
    if (!x) return null;
    return {
      id: x.id,
      name: x.name,
      position: x.position,
      slug: x.slug,
      synced: {
        cfbdId: x.cfbdId,
        rosterYears: x.rosterYears,
        heightIn: x.heightIn,
        weightLb: x.weightLb,
        highSchool: x.highSchool,
        city: x.city,
        state: x.state,
      },
      editable: {
        status: x.status,
        onBigBoard: x.onBigBoard,
        aliases: x.aliases,
        bio: x.bio,
        stars: x.stars,
        classYear: x.classYear,
        committedTo: x.committedTo,
      },
      videoCount: videoCount(x.id),
    };
  },

  async savePlayer(id, fields) {
    const x = playerById(id);
    if (!x) throw new Error(`Player not found: ${id}`);
    Object.assign(x, fields);
  },

  async searchPlayers(query, limit = 20): Promise<PlayerOption[]> {
    const q = query.toLowerCase().trim();
    return PLAYERS.filter(
      (x) =>
        !q ||
        x.name.toLowerCase().includes(q) ||
        x.aliases.some((a) => a.toLowerCase().includes(q)),
    )
      .slice(0, limit)
      .map((x) => ({
        id: x.id,
        name: x.name,
        position: x.position,
        rosterYears: x.rosterYears,
      }));
  },

  async searchConcepts(query, limit = 20) {
    const q = query.toLowerCase().trim();
    return CONCEPTS.filter((c) => !q || c.label.toLowerCase().includes(q)).slice(0, limit);
  },

  async listSeries() {
    return SERIES;
  },

  async triggerSync() {
    syncStatus = {
      lastSyncAt: new Date().toISOString(),
      state: "ok",
      error: null,
      videosAdded: 0,
      videosUpdated: VIDEOS.length,
    };
    return syncStatus;
  },
};

/** Test hook — restores fixtures after mutation experiments. */
export function __resetMock() {
  VIDEOS = VIDEOS.map((x) => ({ ...x }));
}
