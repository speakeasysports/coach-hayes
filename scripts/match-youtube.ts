/**
 * One-off: match Coach Hayes's YouTube uploads to the 2027 Big Board roster.
 * Writes youtube-matches.csv for human review. Never modifies the Sheet.
 *
 *   YOUTUBE_API_KEY=... npm run match:youtube
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";

const API_BASE = "https://www.googleapis.com/youtube/v3";
const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_HANDLE = process.env.CHANNEL_HANDLE ?? "@CoachHayesHudl";

if (!API_KEY) {
  console.error(
    "Missing YOUTUBE_API_KEY. Copy .env.example to .env and fill it in.",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Roster (2027 Big Board). Keep in sync with the BigBoard sheet manually —
// this script is intentionally one-off and self-contained.
// ---------------------------------------------------------------------------
type RosterEntry = { position: string; name: string };

const ROSTER: RosterEntry[] = [
  { position: "QB", name: "C Nussmeier" },
  { position: "QB", name: "D Davison" },
  { position: "QB", name: "J Roberts" },
  { position: "QB", name: "P Bourque" },
  { position: "QB", name: "K Croucher" },
  { position: "QB", name: "B Roskopf" },
  { position: "QB", name: "B Coleman" },
  { position: "QB", name: "D Mielke" },
  { position: "RB", name: "Kemon Spell" },
  { position: "RB", name: "Noah Parker" },
  { position: "RB", name: "A Beard" },
  { position: "RB", name: "D Gabriel-Georges" },
  { position: "RB", name: "B Tyson" },
  { position: "RB", name: "Q Gipson" },
  { position: "RB", name: "N Newkirk" },
  { position: "RB", name: "I Rogers" },
  { position: "RB", name: "J Bradford" },
  { position: "RB", name: "M Stephen" },
  { position: "RB", name: "T Grant" },
  { position: "WR (X)", name: "A Starling" },
  { position: "WR (X)", name: "A Patterson" },
  { position: "WR (X)", name: "J Watkins" },
  { position: "WR (X)", name: "T Walden" },
  { position: "WR (X)", name: "T Collins" },
  { position: "WR (X)", name: "D Warren" },
  { position: "WR (X)", name: "C Ferguson" },
  { position: "WR (X)", name: "D Hall" },
  { position: "WR (X)", name: "V Carmack" },
  { position: "WR (X)", name: "B Burrus" },
  { position: "WR (X)", name: "MJ Knight" },
  { position: "WR (Z)", name: "X Sabb" },
  { position: "WR (Z)", name: "T Rawlins" },
  { position: "WR (Z)", name: "DJ Huggins" },
  { position: "WR (Z)", name: "K Taylor" },
  { position: "WR (Z)", name: "K Young" },
  { position: "WR (Z)", name: "O Gayles" },
  { position: "WR (Z)", name: "B Porter" },
  { position: "WR (Z)", name: "A Lockett" },
  { position: "WR (Z)", name: "Z Vilma" },
  { position: "WR (Z)", name: "K Caldwell" },
  { position: "WR (S)", name: "E McFarland" },
  { position: "WR (S)", name: "S Green" },
  { position: "WR (S)", name: "E Pearl" },
  { position: "WR (S)", name: "J Christie" },
  { position: "WR (S)", name: "M Fennell" },
  { position: "WR (S)", name: "J Weaver" },
  { position: "WR (S)", name: "J Simmons" },
  { position: "TE", name: "B Williams" },
  { position: "TE", name: "C Crawford" },
  { position: "TE", name: "G Haviland" },
  { position: "TE", name: "J Dollar" },
  { position: "TE", name: "C Terwilliger" },
  { position: "TE", name: "Z Fares" },
  { position: "TE", name: "J Lancaster" },
  { position: "TE", name: "C Blackwell" },
  { position: "IOL", name: "J Agbanoma" },
  { position: "IOL", name: "J Williams" },
  { position: "IOL", name: "J Thompson" },
  { position: "IOL", name: "B Daniels" },
  { position: "IOL", name: "J Moore" },
  { position: "IOL", name: "R Ramsier" },
  { position: "IOL", name: "K Mallard" },
  { position: "IOL", name: "E Morrison" },
  { position: "OL", name: "T Ford" },
  { position: "OL", name: "N Carson" },
  { position: "OL", name: "A Peitz" },
  { position: "OL", name: "J Sadjo" },
  { position: "OT", name: "Kelsey Adams" },
  { position: "OT", name: "JS Epelle" },
  { position: "OT", name: "E Hutchenson" },
  { position: "OT", name: "B Mills" },
  { position: "OT", name: "N Kampas" },
  { position: "OT", name: "T Alui" },
  { position: "OT", name: "J Burns" },
  { position: "OT", name: "JJ Brown" },
  { position: "OT", name: "A Eisenhower" },
  { position: "OT", name: "C Mathis" },
  { position: "OT", name: "J Oaodatuga" },
  { position: "OT", name: "T Johnson" },
  { position: "NT", name: "C Hector" },
  { position: "NT", name: "J Agberodiola" },
  { position: "DT", name: "K May" },
  { position: "DT", name: "S Tillman" },
  { position: "DT", name: "A McKoy" },
  { position: "DT", name: "M Fakatou" },
  { position: "DT", name: "N Kamba" },
  { position: "DT", name: "J Thompson" },
  { position: "DT", name: "E Brown" },
  { position: "DT", name: "W Wooten" },
  { position: "DT", name: "J Archer" },
  { position: "DT", name: "D Pauldo" },
  { position: "DT", name: "T Alexander" },
  { position: "DT", name: "K Robinson-Vickers" },
  { position: "DE", name: "M Nguetsop" },
  { position: "DE", name: "J Fields" },
  { position: "DE", name: "M Casario" },
  { position: "DE", name: "C Wheeler" },
  { position: "OLB", name: "J Weeks" },
  { position: "OLB", name: "S Nwabude" },
  { position: "OLB", name: "D Jacobs" },
  { position: "OLB", name: "KJ Green" },
  { position: "OLB", name: "A Rojas" },
  { position: "OLB", name: "S Harvey" },
  { position: "OLB", name: "A Sweeney" },
  { position: "OLB", name: "R Jackson" },
  { position: "OLB", name: "G Galloway" },
  { position: "OLB", name: "X Perkins" },
  { position: "LB", name: "J Gouda" },
  { position: "LB", name: "N Glover" },
  { position: "LB", name: "C Witten" },
  { position: "LB", name: "Q Cypher" },
  { position: "LB", name: "JB Smith" },
  { position: "LB", name: "J Mayfield" },
  { position: "LB", name: "I McNeil" },
  { position: "LB", name: "A Randle" },
  { position: "LB", name: "E Hauser" },
  { position: "LB", name: "J Holly" },
  { position: "LB", name: "J Pace" },
  { position: "LB", name: "T Wilson" },
  { position: "CB", name: "Donte' Wright" },
  { position: "CB", name: "J Outhouse" },
  { position: "CB", name: "C Johnson" },
  { position: "CB", name: "D Haley" },
  { position: "CB", name: "D Wight" },
  { position: "CB", name: "M Fleming" },
  { position: "CB", name: "L Moon" },
  { position: "CB", name: "B Allen" },
  { position: "CB", name: "C Gaylord" },
  { position: "CB", name: "T Miller" },
  { position: "CB", name: "T Boyd" },
  { position: "CB", name: "S Gourdine" },
  { position: "CB", name: "T Moreland" },
  { position: "CB", name: "A Hall" },
  { position: "DB", name: "J Aparcio-Bailey" },
  { position: "DB", name: "C Gilbert" },
  { position: "DB", name: "J Elzey" },
  { position: "DB", name: "J Cantrell" },
  { position: "DB", name: "E Hauser" },
  { position: "DB", name: "D Haley" },
  { position: "DB", name: "J James" },
  { position: "S", name: "T Poole" },
  { position: "S", name: "K Dorsey" },
  { position: "S", name: "A Cole" },
  { position: "S", name: "KJ Caldwell" },
  { position: "S", name: "J Scott" },
  { position: "S", name: "T Harrington" },
  { position: "S", name: "Z Gamble" },
  { position: "S", name: "D Jones" },
  { position: "S", name: "MJ Burnett" },
];

// ---------------------------------------------------------------------------
// Name parsing + tokenization
// ---------------------------------------------------------------------------
type Parsed = {
  raw: string;
  firstToken: string; // normalized, e.g. "kemon", "mj", "c"
  firstInitial: string; // single char
  firstIsInitials: boolean; // "C", "MJ", "DJ", etc.
  lastName: string; // normalized whole surname incl. hyphen
  lastTokens: string[]; // for hyphenated: ["gabriel", "georges"]
};

function clean(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[‘’']/g, "")
    .toLowerCase();
}

function tokenize(s: string): string[] {
  return clean(s)
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean);
}

function parseRoster(name: string): Parsed {
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1];
  const firstRaw = parts.slice(0, -1).join(" ");
  // "MJ", "DJ", "JJ", "JB", "KJ" — 2-3 uppercase letters, no first name
  const firstIsInitials =
    parts.length >= 2 && /^[A-Z]{1,3}$/.test(parts[0]) && parts.length === 2;
  const firstToken = clean(firstRaw);
  return {
    raw: name,
    firstToken,
    firstInitial: firstToken[0] ?? "",
    firstIsInitials,
    lastName: clean(last),
    lastTokens: clean(last).split("-").filter(Boolean),
  };
}

// ---------------------------------------------------------------------------
// YouTube API
// ---------------------------------------------------------------------------
type Video = {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnail: string;
};

async function gj<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`YouTube API ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

async function resolveUploadsPlaylist(handle: string): Promise<string> {
  const h = handle.startsWith("@") ? handle : `@${handle}`;
  const url =
    `${API_BASE}/channels?part=contentDetails` +
    `&forHandle=${encodeURIComponent(h)}&key=${API_KEY}`;
  const data = await gj<{
    items?: Array<{
      contentDetails: { relatedPlaylists: { uploads: string } };
    }>;
  }>(url);
  if (!data.items?.length) throw new Error(`No channel for handle ${h}`);
  return data.items[0].contentDetails.relatedPlaylists.uploads;
}

async function fetchAllUploads(playlistId: string): Promise<Video[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const u = new URL(`${API_BASE}/playlistItems`);
    u.searchParams.set("part", "contentDetails");
    u.searchParams.set("playlistId", playlistId);
    u.searchParams.set("maxResults", "50");
    u.searchParams.set("key", API_KEY!);
    if (pageToken) u.searchParams.set("pageToken", pageToken);
    const data = await gj<{
      items: Array<{ contentDetails: { videoId: string } }>;
      nextPageToken?: string;
    }>(u.toString());
    for (const it of data.items) ids.push(it.contentDetails.videoId);
    pageToken = data.nextPageToken;
  } while (pageToken);

  const videos: Video[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const u = new URL(`${API_BASE}/videos`);
    u.searchParams.set("part", "snippet");
    u.searchParams.set("id", batch.join(","));
    u.searchParams.set("maxResults", "50");
    u.searchParams.set("key", API_KEY!);
    const data = await gj<{
      items: Array<{
        id: string;
        snippet: {
          title: string;
          description: string;
          publishedAt: string;
          thumbnails: Record<string, { url: string } | undefined>;
        };
      }>;
    }>(u.toString());
    for (const it of data.items) {
      videos.push({
        videoId: it.id,
        title: it.snippet.title,
        description: it.snippet.description,
        publishedAt: it.snippet.publishedAt,
        thumbnail:
          it.snippet.thumbnails.medium?.url ??
          it.snippet.thumbnails.default?.url ??
          "",
      });
    }
  }
  return videos;
}

// ---------------------------------------------------------------------------
// Scoring. Last name = strong signal; first name/initial = tiebreaker.
// ---------------------------------------------------------------------------
function scoreVideo(p: Parsed, v: Video): number {
  const titleTokens = tokenize(v.title);
  const descTokens = tokenize(v.description);

  const lastIn = (toks: string[]): boolean => {
    if (toks.includes(p.lastName)) return true;
    if (
      p.lastTokens.length > 1 &&
      p.lastTokens.every((t) => toks.includes(t))
    ) {
      return true;
    }
    return false;
  };

  const lastInTitle = lastIn(titleTokens);
  const lastInDesc = lastIn(descTokens);

  if (!lastInTitle && !lastInDesc) {
    // Partial: any single segment of a hyphenated surname appears.
    // Low confidence — surfaces in NEEDS REVIEW.
    if (p.lastTokens.length > 1) {
      if (p.lastTokens.some((t) => titleTokens.includes(t))) return 35;
      if (p.lastTokens.some((t) => descTokens.includes(t))) return 20;
    }
    return 0;
  }

  const fullFirstInTitle =
    !p.firstIsInitials && p.firstToken && titleTokens.includes(p.firstToken);
  const fullFirstInDesc =
    !p.firstIsInitials && p.firstToken && descTokens.includes(p.firstToken);

  // Find "initial-letter-matching" word adjacent to the last name in the title.
  let initialAdjacent = false;
  let initialSomewhere = false;
  if (p.firstInitial) {
    // Possible last-name anchor positions: full surname token or first hyphen seg.
    const anchors = new Set<number>();
    const fullIdx = titleTokens.indexOf(p.lastName);
    if (fullIdx >= 0) anchors.add(fullIdx);
    if (p.lastTokens.length > 1) {
      const segIdx = titleTokens.indexOf(p.lastTokens[0]);
      if (segIdx >= 0) anchors.add(segIdx);
    }
    for (const idx of anchors) {
      if (idx > 0) {
        const prev = titleTokens[idx - 1];
        if (
          prev !== p.lastName &&
          !p.lastTokens.includes(prev) &&
          prev.startsWith(p.firstInitial)
        ) {
          initialAdjacent = true;
          break;
        }
      }
    }
    initialSomewhere = titleTokens.some(
      (t) =>
        t !== p.lastName &&
        !p.lastTokens.includes(t) &&
        t.startsWith(p.firstInitial),
    );
  }

  if (lastInTitle) {
    if (fullFirstInTitle) return 100;
    // Initial-only signals always fall under the NEEDS REVIEW threshold (<80):
    // when the roster gives us only an initial we can't distinguish "C Nussmeier
    // → Cade Nussmeier" from coincidences like "R Jackson → Recruit Jackson Cantwell"
    // without a human check.
    if (initialAdjacent) return 78;
    if (initialSomewhere) return 65;
    return 70;
  }
  // last name only in description
  if (fullFirstInDesc) return 60;
  return 45;
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------
function csvField(v: string | number): string {
  const s = String(v);
  if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log(`Resolving channel ${CHANNEL_HANDLE}...`);
  const playlistId = await resolveUploadsPlaylist(CHANNEL_HANDLE);
  console.log(`Uploads playlist: ${playlistId}`);

  console.log(`Fetching all uploads...`);
  const videos = await fetchAllUploads(playlistId);
  console.log(`Got ${videos.length} videos`);

  const players = ROSTER.map((r) => ({ ...r, parsed: parseRoster(r.name) }));

  // Surname -> roster entries (for duplicate-surname ambiguity flagging)
  const bySurname = new Map<string, typeof players>();
  for (const p of players) {
    const arr = bySurname.get(p.parsed.lastName) ?? [];
    arr.push(p);
    bySurname.set(p.parsed.lastName, arr);
  }

  type Row = {
    position: string;
    name: string;
    bestScore: number;
    bestVideo: Video | null;
    candidates: Array<{ video: Video; score: number }>;
    ambiguous: boolean;
  };

  const rows: Row[] = players.map((p) => {
    const scored = videos
      .map((v) => ({ video: v, score: scoreVideo(p.parsed, v) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    const best = scored[0] ?? null;
    const surnameShared = (bySurname.get(p.parsed.lastName)?.length ?? 0) > 1;
    return {
      position: p.position,
      name: p.name,
      bestScore: best?.score ?? 0,
      bestVideo: best?.video ?? null,
      candidates: scored.slice(1, 6),
      ambiguous: surnameShared && best != null,
    };
  });

  // Sort: lowest confidence (incl. 0/no-match) first so reviewers see issues up top.
  rows.sort((a, b) => {
    if (a.bestScore !== b.bestScore) return a.bestScore - b.bestScore;
    return a.name.localeCompare(b.name);
  });

  const HEADER = [
    "position",
    "player_name",
    "best_match_title",
    "best_match_videoId",
    "video_url",
    "confidence",
    "other_candidate_titles",
  ].join(",");

  const lines = [HEADER];
  for (const r of rows) {
    let title = r.bestVideo?.title ?? "";
    if (r.bestVideo) {
      const flags: string[] = [];
      if (r.ambiguous) flags.push("AMBIGUOUS — verify position");
      if (r.bestScore < 80) flags.push("NEEDS REVIEW");
      if (flags.length) title = `[${flags.join(" | ")}] ${title}`;
    }
    const url = r.bestVideo
      ? `https://www.youtube.com/watch?v=${r.bestVideo.videoId}`
      : "";
    const others = r.candidates
      .map((c) => `${c.video.title} (${c.score})`)
      .join(" | ");
    lines.push(
      [
        csvField(r.position),
        csvField(r.name),
        csvField(title),
        csvField(r.bestVideo?.videoId ?? ""),
        csvField(url),
        csvField(r.bestScore),
        csvField(others),
      ].join(","),
    );
  }

  const outPath = path.resolve(process.cwd(), "youtube-matches.csv");
  await writeFile(outPath, lines.join("\n") + "\n", "utf8");

  const total = rows.length;
  const noMatch = rows.filter((r) => r.bestScore === 0).length;
  const needsReview = rows.filter(
    (r) => r.bestScore > 0 && (r.bestScore < 80 || r.ambiguous),
  ).length;
  const autoConfident = total - noMatch - needsReview;

  console.log(`\nWrote ${path.relative(process.cwd(), outPath)}`);
  console.log(`\nSummary`);
  console.log(`  Total players:           ${total}`);
  console.log(`  Auto-confident (>=80):   ${autoConfident}`);
  console.log(`  Needs review (<80 / amb): ${needsReview}`);
  console.log(`  No match:                ${noMatch}`);
  console.log(`\nReview the CSV before pasting any video_urls into the Sheet.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
