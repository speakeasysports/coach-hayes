/**
 * One-off: analyze the Coach Hayes back catalog to size the rebuild.
 *
 * Read-only. Pulls every upload (snippet + contentDetails + statistics),
 * classifies content type, extracts candidate player names, and reports
 * class-year distribution and cadence.
 *
 *   npx tsx --env-file=.env scripts/catalog-analysis.ts
 *
 * Writes catalog-analysis.json for follow-up querying.
 */
import { writeFile } from "node:fs/promises";

const API_BASE = "https://www.googleapis.com/youtube/v3";
const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_HANDLE = process.env.CHANNEL_HANDLE ?? "@CoachHayesHudl";

if (!API_KEY) {
  console.error("Missing YOUTUBE_API_KEY. See .env.example.");
  process.exit(1);
}

type Video = {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  durationSec: number;
  views: number;
};

async function gj<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

async function resolveUploadsPlaylist(handle: string): Promise<string> {
  const h = handle.startsWith("@") ? handle : `@${handle}`;
  const data = await gj<{
    items?: Array<{ contentDetails: { relatedPlaylists: { uploads: string } } }>;
  }>(
    `${API_BASE}/channels?part=contentDetails&forHandle=${encodeURIComponent(h)}&key=${API_KEY}`,
  );
  if (!data.items?.length) throw new Error(`No channel for handle ${h}`);
  return data.items[0].contentDetails.relatedPlaylists.uploads;
}

/** ISO-8601 PT#M#S → seconds */
function parseDuration(iso: string): number {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
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
    const u = new URL(`${API_BASE}/videos`);
    u.searchParams.set("part", "snippet,contentDetails,statistics");
    u.searchParams.set("id", ids.slice(i, i + 50).join(","));
    u.searchParams.set("maxResults", "50");
    u.searchParams.set("key", API_KEY!);
    const data = await gj<{
      items: Array<{
        id: string;
        snippet: { title: string; description: string; publishedAt: string };
        contentDetails: { duration: string };
        statistics: { viewCount?: string };
      }>;
    }>(u.toString());
    for (const it of data.items) {
      videos.push({
        videoId: it.id,
        title: it.snippet.title,
        description: it.snippet.description ?? "",
        publishedAt: it.snippet.publishedAt,
        durationSec: parseDuration(it.contentDetails.duration),
        views: Number(it.statistics?.viewCount ?? 0),
      });
    }
  }
  return videos;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------
type Category =
  | "podcast"
  | "recruiting"
  | "scheme"
  | "player-breakdown"
  | "game"
  | "other";

const RX = {
  podcast: /\b(podcast|head on a swivel|ep\.?\s*\d+|episode)\b/i,
  recruiting:
    /\b(recruit|rankings?|commit|decommit|offer|visit|flip|signing|class of|transfer portal|\d{4}\s*(?:qb|rb|wr|te|ol|dl|lb|db|ath)\b)/i,
  scheme:
    /\b(scheme|x'?s\s*(?:&|and)\s*o'?s|coverage|cover\s*\d|rpo|concept|blitz|front|zone|man|route|protection|install|playbook)\b/i,
  breakdown: /\b(breakdown|film|evaluation|eval|tape|scouting|analysis)\b/i,
  game: /\b(vs\.?|versus|preview|recap|review|postgame|halftime|gameday)\b/i,
};

function classify(v: Video): Category {
  const t = v.title;
  if (RX.podcast.test(t)) return "podcast";
  if (RX.recruiting.test(t)) return "recruiting";
  if (RX.scheme.test(t)) return "scheme";
  if (RX.breakdown.test(t)) return "player-breakdown";
  if (RX.game.test(t)) return "game";
  return "other";
}

// ---------------------------------------------------------------------------
// Candidate player-name extraction
//
// Heuristic: capitalized bigrams in the title that aren't football jargon,
// team names, or common words. Deliberately conservative — this estimates the
// number of DISTINCT PEOPLE the catalog names, to size /players/[slug].
// ---------------------------------------------------------------------------
const STOP = new Set(
  `georgia bulldogs uga dawgs alabama auburn tennessee florida clemson lsu texas
   oklahoma ohio michigan penn state notre dame south carolina kentucky missouri
   ole miss mississippi arkansas vanderbilt texas a&m aggies volunteers gators
   tigers crimson tide seminoles gamecocks wildcats commodores razorbacks rebels
   sec acc big ten pac espn cfp playoff national championship bowl game
   head swivel coach hayes hudl film breakdown analysis scheme defense offense
   defensive offensive quarterback running back wide receiver tight end
   offensive line defensive line linebacker defensive back athlete kicker punter
   qb rb wr te ol dl lb db ath the this that what why how who when where
   is are was were will can has have had does did should could would
   new top best elite must watch full live now next week season spring fall
   summer winter early signing day national letter intent nil portal
   my his her their our your video part episode ep vs versus preview recap
   review react reaction thoughts takes take talk talking watch watching
   first second third fourth quarter half time out down yard yards touchdown
   pass run rush catch tackle sack blitz zone man cover coverage front
   rankings ranking ranked rank recruit recruits recruiting commit commits
   committed decommit offer offers visit visits class signing signed
   player players team teams roster depth chart position group unit
   big board update updates news breaking report`
    .split(/\s+/)
    .filter(Boolean),
);

const NAME_RX = /\b([A-Z][a-z'’]{1,15})\s+([A-Z][a-z'’]{1,15}(?:-[A-Z][a-z'’]{1,15})?)\b/g;

function extractNames(title: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  NAME_RX.lastIndex = 0;
  while ((m = NAME_RX.exec(title))) {
    const first = m[1];
    const last = m[2];
    if (STOP.has(first.toLowerCase()) || STOP.has(last.toLowerCase())) continue;
    out.push(`${first} ${last}`);
  }
  return out;
}

function pct(n: number, total: number): string {
  return total === 0 ? "0%" : `${Math.round((n / total) * 100)}%`;
}

function bar(n: number, max: number, width = 28): string {
  const filled = max === 0 ? 0 : Math.round((n / max) * width);
  return "█".repeat(filled) + "·".repeat(width - filled);
}

async function main() {
  process.stdout.write(`Resolving ${CHANNEL_HANDLE}…\n`);
  const playlist = await resolveUploadsPlaylist(CHANNEL_HANDLE);
  process.stdout.write(`Fetching uploads (playlist ${playlist})…\n`);
  const videos = await fetchAllUploads(playlist);
  const total = videos.length;

  videos.sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
  const first = videos[0];
  const last = videos[total - 1];

  process.stdout.write(`\n${"=".repeat(60)}\nCATALOG: ${total} videos\n${"=".repeat(60)}\n`);
  process.stdout.write(
    `Range   ${first.publishedAt.slice(0, 10)} → ${last.publishedAt.slice(0, 10)}\n`,
  );
  const days =
    (Date.parse(last.publishedAt) - Date.parse(first.publishedAt)) / 86400000;
  process.stdout.write(
    `Span    ${Math.round(days)} days (~${(total / (days / 7)).toFixed(1)} videos/week)\n`,
  );

  // Format split
  const shorts = videos.filter((v) => v.durationSec > 0 && v.durationSec <= 60);
  const longform = videos.filter((v) => v.durationSec > 60);
  process.stdout.write(
    `\nFORMAT\n  Shorts (≤60s)   ${String(shorts.length).padStart(4)}  ${pct(shorts.length, total)}\n` +
      `  Long-form       ${String(longform.length).padStart(4)}  ${pct(longform.length, total)}\n`,
  );
  const totalMin = Math.round(
    videos.reduce((s, v) => s + v.durationSec, 0) / 60,
  );
  process.stdout.write(`  Total runtime   ${totalMin} min (${(totalMin / 60).toFixed(1)} hrs)\n`);

  // Category split
  const byCat = new Map<Category, Video[]>();
  for (const v of videos) {
    const c = classify(v);
    byCat.set(c, [...(byCat.get(c) ?? []), v]);
  }
  const catMax = Math.max(...[...byCat.values()].map((a) => a.length));
  process.stdout.write(`\nCONTENT TYPE (title heuristics)\n`);
  const catOrder: Category[] = [
    "recruiting",
    "player-breakdown",
    "scheme",
    "podcast",
    "game",
    "other",
  ];
  for (const c of catOrder) {
    const arr = byCat.get(c) ?? [];
    process.stdout.write(
      `  ${c.padEnd(17)}${String(arr.length).padStart(4)}  ${pct(arr.length, total).padStart(4)}  ${bar(arr.length, catMax)}\n`,
    );
  }

  // Class-year mentions
  process.stdout.write(`\nRECRUITING CLASS MENTIONS (title or description)\n`);
  const years = [2024, 2025, 2026, 2027, 2028, 2029];
  const yearCounts = new Map<number, number>();
  for (const y of years) {
    const rx = new RegExp(`\\b${y}\\b`);
    yearCounts.set(
      y,
      videos.filter((v) => rx.test(v.title) || rx.test(v.description)).length,
    );
  }
  const yMax = Math.max(...yearCounts.values());
  for (const y of years) {
    const n = yearCounts.get(y)!;
    process.stdout.write(
      `  ${y}${String(n).padStart(6)}  ${pct(n, total).padStart(4)}  ${bar(n, yMax)}\n`,
    );
  }

  // Candidate players
  const nameCounts = new Map<string, number>();
  for (const v of videos) {
    for (const n of new Set(extractNames(v.title))) {
      nameCounts.set(n, (nameCounts.get(n) ?? 0) + 1);
    }
  }
  const named = [...nameCounts.entries()].sort((a, b) => b[1] - a[1]);
  const titlesWithName = videos.filter((v) => extractNames(v.title).length > 0);
  process.stdout.write(
    `\nCANDIDATE PLAYER NAMES (from titles only, conservative)\n` +
      `  Distinct names        ${named.length}\n` +
      `  Videos naming someone ${titlesWithName.length}  (${pct(titlesWithName.length, total)})\n` +
      `  Named 2+ times        ${named.filter(([, c]) => c >= 2).length}\n`,
  );
  process.stdout.write(`\n  Top 25 by mention count:\n`);
  for (const [name, count] of named.slice(0, 25)) {
    process.stdout.write(`    ${String(count).padStart(3)}×  ${name}\n`);
  }

  // Reach
  const views = videos.map((v) => v.views).sort((a, b) => b - a);
  const totalViews = views.reduce((s, v) => s + v, 0);
  const median = views[Math.floor(views.length / 2)] ?? 0;
  process.stdout.write(
    `\nREACH\n  Total views   ${totalViews.toLocaleString()}\n` +
      `  Median/video  ${median.toLocaleString()}\n` +
      `  Best video    ${views[0]?.toLocaleString() ?? 0}\n`,
  );
  process.stdout.write(`\n  Top 10 by views:\n`);
  for (const v of [...videos].sort((a, b) => b.views - a.views).slice(0, 10)) {
    process.stdout.write(
      `    ${String(v.views).padStart(7)}  ${v.publishedAt.slice(0, 10)}  ${v.title.slice(0, 62)}\n`,
    );
  }

  // Cadence by year
  process.stdout.write(`\nUPLOADS BY YEAR\n`);
  const byYear = new Map<string, number>();
  for (const v of videos) {
    const y = v.publishedAt.slice(0, 4);
    byYear.set(y, (byYear.get(y) ?? 0) + 1);
  }
  const yrMax = Math.max(...byYear.values());
  for (const [y, n] of [...byYear.entries()].sort()) {
    process.stdout.write(
      `  ${y}${String(n).padStart(6)}  ${bar(n, yrMax)}\n`,
    );
  }

  await writeFile(
    "catalog-analysis.json",
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        total,
        range: { first: first.publishedAt, last: last.publishedAt },
        categories: Object.fromEntries(
          catOrder.map((c) => [c, (byCat.get(c) ?? []).length]),
        ),
        classMentions: Object.fromEntries(yearCounts),
        distinctNames: named.length,
        names: named,
        videos: videos.map((v) => ({
          ...v,
          category: classify(v),
          names: [...new Set(extractNames(v.title))],
        })),
      },
      null,
      2,
    ),
    "utf8",
  );
  process.stdout.write(`\nWrote catalog-analysis.json\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
