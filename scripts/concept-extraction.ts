/**
 * One-off: find football concepts across the whole back catalog to size
 * /playbook/[concept].
 *
 * Reads catalog-analysis.json (run scripts/catalog-analysis.ts first).
 * Scans BOTH titles and descriptions across all videos — not just the
 * "scheme"-classified ones, since concepts show up in breakdowns and
 * recruiting videos too.
 *
 *   npx tsx scripts/concept-extraction.ts
 */
import { readFile, writeFile } from "node:fs/promises";

type Video = {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  durationSec: number;
  views: number;
  category: string;
};

type Concept = {
  /** kebab slug → /playbook/<slug> */
  slug: string;
  label: string;
  family: Family;
  rx: RegExp;
};

type Family =
  | "run game"
  | "pass game"
  | "protection"
  | "coverage"
  | "front / pressure"
  | "technique"
  | "formation"
  | "position group"
  | "roster / recruiting"
  | "situation";

/**
 * Patterns are deliberately specific. Bare words like "zone", "man", "power"
 * are too generic to match alone and would swamp the results with false
 * positives, so they only count in a qualified phrase.
 */
const CONCEPTS: Concept[] = [
  // ---- run game: BLOCKING SCHEMES ------------------------------------------
  // These are his actual teaching vocabulary, discovered by n-gram mining the
  // catalog rather than guessing. "zone" is his single biggest theme, but bare
  // "zone" collides with "red zone" (field position, not a scheme), so every
  // zone pattern below either qualifies the word or excludes the red-zone case.
  c(
    "zone-blocking",
    "Zone Blocking",
    "run game",
    /\bzone\s*(?:block(?:ing)?|scheme|run|game|cut|buster)\b|\bbase\s*zone\b|\banatomy\s*of\s*the\s*.{0,12}zone\b/i,
  ),
  c(
    "zone-fits",
    "Zone Fits",
    "run game",
    /\bzone\s*fits?\b|\brun\s*fits?\b|\bfit(?:ting)?\s*the\s*zone\b/i,
  ),
  c(
    "gap-scheme",
    "Gap Scheme",
    "run game",
    /\bgap\s*(?:scheme|block(?:ing)?|run|power|recognition|control|integrity|sound|responsibilit)/i,
  ),
  c("stretch", "Stretch", "run game", /\bstretch\s*(?:run|play|concept|zone|scheme)?\b/i),
  c("buck-sweep", "Buck Sweep", "run game", /\bbuck\s*sweep\b/i),
  c("counter-trey", "Counter Trey", "run game", /\bcounter\s*(?:trey|tre|gt)\b/i),
  c("counter", "Counter", "run game", /\bcounter\b(?!\s*(?:trey|tre|gt))/i),
  c("power", "Power", "run game", /\bpower\s*(?:run|game|read|o\b|scheme)|\brun\s*power\b/i),
  c("inside-zone", "Inside Zone", "run game", /\binside\s*zone\b/i),
  c("outside-zone", "Outside Zone", "run game", /\boutside\s*zone\b/i),
  c("split-zone", "Split Zone", "run game", /\bsplit\s*zone\b/i),
  c("zone-read", "Zone Read", "run game", /\bzone\s*read\b/i),
  c("duo", "Duo", "run game", /\bduo\b/i),
  c("iso", "Iso", "run game", /\biso(?:lation)?\s*(?:run|play|concept)?\b/i),
  c("trap", "Trap", "run game", /\btrap\s*(?:run|play|block|scheme)|\brun\s*trap\b/i),
  c("toss", "Toss", "run game", /\btoss\s*(?:play|sweep|crack)?\b/i),
  c("jet-sweep", "Jet Sweep", "run game", /\bjet\s*(?:sweep|motion)\b/i),
  c("speed-option", "Speed Option", "run game", /\bspeed\s*option\b/i),
  c("triple-option", "Triple Option", "run game", /\btriple\s*option\b/i),
  c("veer", "Veer", "run game", /\bveer\b/i),
  c("dart", "Dart", "run game", /\bdart\s*(?:scheme|run|play)?\b/i),
  c("pin-and-pull", "Pin & Pull", "run game", /\bpin\s*(?:and|&|-)\s*pull\b/i),
  c("wham", "Wham", "run game", /\bwham\b/i),
  c("draw", "Draw", "run game", /\bdraw\s*(?:play|game)\b/i),

  // ---- pass game ----
  c("mesh", "Mesh", "pass game", /\bmesh\b/i),
  c("smash", "Smash", "pass game", /\bsmash\s*(?:concept|route)?\b/i),
  c("flood", "Flood", "pass game", /\bflood\s*(?:concept|route)?\b/i),
  c("four-verticals", "Four Verticals", "pass game", /\b(?:four|4)\s*(?:verticals?|verts?)\b/i),
  c("y-cross", "Y-Cross", "pass game", /\by[\s-]*cross\b/i),
  c("shallow-cross", "Shallow Cross", "pass game", /\bshallow\s*(?:cross)?\b/i),
  c("dagger", "Dagger", "pass game", /\bdagger\b/i),
  c("sail", "Sail", "pass game", /\bsail\s*(?:concept|route)?\b/i),
  c("stick", "Stick", "pass game", /\bstick\s*(?:concept|route|draw)\b/i),
  c("snag", "Snag", "pass game", /\bsnag\b/i),
  c("levels", "Levels", "pass game", /\blevels\s*(?:concept)?\b/i),
  c("slant-flat", "Slant-Flat", "pass game", /\bslant[\s-]*(?:flat|bubble)\b/i),
  c("post-wheel", "Post-Wheel", "pass game", /\bpost[\s-]*wheel\b/i),
  c("glance", "Glance", "pass game", /\bglance\b/i),
  c("sluggo", "Sluggo", "pass game", /\bsluggo\b|\bslant\s*(?:and|&)\s*go\b/i),
  c("screen", "Screen Game", "pass game", /\b(?:bubble|tunnel|screen)\s*(?:screen|game|pass)?\b/i),
  c("rpo", "RPO", "pass game", /\brpo\b|\brun[\s-]*pass[\s-]*option\b/i),
  c("play-action", "Play Action", "pass game", /\bplay[\s-]*action\b|\bplay[\s-]*pass\b/i),
  c("boot-naked", "Boot / Naked", "pass game", /\b(?:boot(?:leg)?|naked)\b/i),
  c("sprint-out", "Sprint Out", "pass game", /\bsprint[\s-]*out\b|\broll[\s-]*out\b/i),

  // ---- protection ----
  c("slide-protection", "Slide Protection", "protection", /\bslide\s*protection\b/i),
  c("big-on-big", "Big on Big", "protection", /\bbig\s*on\s*big\b|\bbob\s*protection\b/i),
  c("max-protect", "Max Protect", "protection", /\bmax\s*protect(?:ion)?\b/i),
  c("pass-protection", "Pass Protection", "protection", /\bpass\s*pro(?:tection)?\b/i),

  // ---- coverage ----
  c("cover-0", "Cover 0", "coverage", /\bcover\s*(?:0|zero)\b/i),
  c("cover-1", "Cover 1", "coverage", /\bcover\s*(?:1|one)\b/i),
  c("cover-2", "Cover 2", "coverage", /\bcover\s*(?:2|two)\b/i),
  c("cover-3", "Cover 3", "coverage", /\bcover\s*(?:3|three)\b/i),
  c("cover-4", "Cover 4", "coverage", /\bcover\s*(?:4|four)\b/i),
  c("cover-6", "Cover 6", "coverage", /\bcover\s*(?:6|six)\b/i),
  c("tampa-2", "Tampa 2", "coverage", /\btampa\s*2\b/i),
  c("quarters", "Quarters", "coverage", /\bquarters\b|\bmatch\s*quarters\b/i),
  c("palms", "Palms", "coverage", /\bpalms\b/i),
  c("robber", "Robber", "coverage", /\brobber\b/i),
  c("man-coverage", "Man Coverage", "coverage", /\bman\s*(?:coverage|free|to\s*man)\b|\bman[\s-]*to[\s-]*man\b/i),
  c("zone-coverage", "Zone Coverage", "coverage", /\bzone\s*coverage\b/i),
  c("match-zone", "Match Zone", "coverage", /\bmatch\s*zone\b|\bzone\s*match\b|\bpattern\s*match/i),
  c("combo-coverage", "Combo Coverage", "coverage", /\bcombo\s*coverage\b|\bcoverage\s*combo\b/i),
  c("bracket", "Bracket", "coverage", /\bbracket(?:ed|ing)?\b/i),
  c("quick-game", "Quick Game", "coverage", /\bcoverage\s*quicks?\b|\bquick\s*game\b/i),
  c("coverage-recognition", "Coverage Recognition", "coverage", /\b(?:coverage|defensive)\s*recognition\b|\brecogni[sz](?:e|ing|tion)\s*(?:the\s*)?coverage\b/i),

  // ---- front / pressure ----
  c("bear-front", "Bear Front", "front / pressure", /\bbear\s*front\b/i),
  c("tite-front", "Tite Front", "front / pressure", /\btite\s*front\b|\b404\s*front\b/i),
  c("mint-front", "Mint Front", "front / pressure", /\bmint\s*front\b/i),
  c("odd-even-front", "Odd / Even Front", "front / pressure", /\b(?:odd|even)\s*front\b/i),
  c("fire-zone", "Fire Zone", "front / pressure", /\bfire\s*zone\b/i),
  c("sim-pressure", "Simulated Pressure", "front / pressure", /\bsim(?:ulated)?\s*pressure\b|\bcreeper\b/i),
  c("stunt-twist", "Stunts & Twists", "front / pressure", /\b(?:stunt|twist)(?:s|ing)?\b/i),
  c("blitz", "Blitz", "front / pressure", /\bblitz(?:es|ing)?\b/i),
  c("nickel-dime", "Nickel / Dime", "front / pressure", /\b(?:nickel|dime)\s*(?:package|defense|front)?\b/i),

  // ---- technique ----
  c("3-technique", "3 Technique", "technique", /\b3\s*tech(?:nique)?\b/i),
  c("5-technique", "5 Technique", "technique", /\b5\s*tech(?:nique)?\b/i),
  c("wide-9", "Wide 9", "technique", /\bwide\s*9\b|\b9\s*tech(?:nique)?\b/i),
  c("gap-integrity", "Gap Integrity", "technique", /\bgap\s*(?:integrity|control|sound|responsibility)\b|\b[abc]\s*gap\b/i),
  c("leverage", "Leverage", "technique", /\bleverage\b/i),
  c("hand-placement", "Hand Placement", "technique", /\bhand\s*(?:placement|usage|fighting)\b/i),
  c("footwork", "Footwork", "technique", /\bfootwork\b/i),

  // ---- formation ----
  c("trips", "Trips", "formation", /\btrips\b/i),
  c("bunch", "Bunch", "formation", /\bbunch\b/i),
  c("empty", "Empty", "formation", /\bempty\s*(?:set|formation|backfield)\b/i),
  c("pistol", "Pistol", "formation", /\bpistol\b/i),
  c("personnel-groupings", "Personnel Groupings", "formation", /\b(?:1[0-3]|2[0-2])\s*personnel\b|\bpersonnel\s*group/i),
  c("motion", "Motion", "formation", /\b(?:pre[\s-]*snap\s*)?motion\b/i),

  // ---- position group ------------------------------------------------------
  // Surfaced by n-gram mining: "running back" (10), "wide receiver" (8),
  // "offensive line" (7), "defensive line" (6), "defensive back" (5). These are
  // a bigger cluster than most scheme concepts and make natural hub pages.
  c("quarterback", "Quarterback", "position group", /\bquarterbacks?\b|\bqb\s*(?:room|group|play|battle|rankings?)\b/i),
  c("running-back", "Running Back", "position group", /\brunning\s*backs?\b|\brb\s*(?:room|group|battle)\b|\bbackfield\b/i),
  c("wide-receiver", "Wide Receiver", "position group", /\bwide\s*receivers?\b|\bwr\s*(?:room|group|corps)\b|\breceiver\s*room\b/i),
  c("tight-end", "Tight End", "position group", /\btight\s*ends?\b|\bte\s*(?:room|group)\b/i),
  c("offensive-line", "Offensive Line", "position group", /\boffensive\s*line\b|\bo[\s-]*line\b|\bol\s*(?:room|group|commit)\b/i),
  c("defensive-line", "Defensive Line", "position group", /\bdefensive\s*line\b|\bd[\s-]*line\b|\bdl\s*(?:room|group|commit)\b|\bedge\s*(?:rusher|room)\b/i),
  c("linebacker", "Linebacker", "position group", /\blinebackers?\b|\blb\s*(?:room|group|commit)\b/i),
  c("defensive-back", "Defensive Back", "position group", /\bdefensive\s*backs?\b|\bdb\s*(?:room|group|commit)\b|\bsecondary\b|\bcornerbacks?\b|\bsafet(?:y|ies)\b/i),

  // ---- roster / recruiting -------------------------------------------------
  // "transfer portal" (16) is the single most-used multi-word phrase in the
  // catalog — larger than any scheme concept.
  c("transfer-portal", "Transfer Portal", "roster / recruiting", /\btransfer\s*portal\b|\bportal\s*(?:commits?|adds?|moves?|entr)/i),
  c("commitments", "Commitments", "roster / recruiting", /\bcommit(?:s|ted|ment|ments)?\b|\bdecommit/i),
  c("rankings", "Rankings", "roster / recruiting", /\brankings?\b|\branked\b|\bbig\s*board\b/i),
  c("nil", "NIL", "roster / recruiting", /\bnil\b|\bname\s*image\s*likeness\b/i),
  c("depth-chart", "Depth Chart", "roster / recruiting", /\bdepth\s*chart\b|\bstarting\s*(?:lineup|job)\b|\bposition\s*battle\b/i),

  // ---- situation -----------------------------------------------------------
  // "red zone" is field position, deliberately kept OUT of the zone-blocking
  // patterns above and tracked here instead.
  c("red-zone", "Red Zone", "situation", /\bred\s*zone\b/i),
  c("third-down", "Third Down", "situation", /\bthird\s*down\b|\b3rd\s*(?:down|&|and)\b/i),
  c("goal-line", "Goal Line", "situation", /\bgoal\s*line\b|\bshort\s*yardage\b/i),
  c("two-minute", "Two Minute", "situation", /\btwo\s*minute\b|\b2\s*minute\b|\bhurry\s*up\b/i),
  c("spring-practice", "Spring Practice", "situation", /\bspring\s*(?:practice|ball|game|scrimmage)\b/i),
  c("scrimmage", "Scrimmage", "situation", /\bscrimmage\b/i),
  c("offseason", "Offseason", "situation", /\boff[\s-]*season\b/i),
  c("bowl-playoff", "Bowl / Playoff", "situation", /\bbowl\s*(?:game|prep|win)?\b|\bplayoffs?\b|\bcfp\b|\bnational\s*championship\b/i),
];

function c(slug: string, label: string, family: Family, rx: RegExp): Concept {
  return { slug, label, family, rx };
}

type Hit = {
  concept: Concept;
  videos: Video[];
  titleHits: number;
};

function bar(n: number, max: number, width = 22): string {
  const f = max === 0 ? 0 : Math.round((n / max) * width);
  return "█".repeat(f) + "·".repeat(width - f);
}

async function main() {
  let raw: string;
  try {
    raw = await readFile("catalog-analysis.json", "utf8");
  } catch {
    console.error(
      "catalog-analysis.json not found. Run:\n" +
        "  npx tsx --env-file=.env scripts/catalog-analysis.ts",
    );
    process.exit(1);
  }
  const videos: Video[] = JSON.parse(raw).videos;

  // -------------------------------------------------------------------------
  // Strip boilerplate. ~200 descriptions share a channel template that itself
  // contains scheme/recruiting words ("...break down new recruits...evaluate
  // their talent and commit..."), which otherwise produces false positives on
  // half the catalog. Any line appearing in >=10 descriptions is template, not
  // content, so it is removed before matching.
  // -------------------------------------------------------------------------
  const lineFreq = new Map<string, number>();
  for (const v of videos) {
    for (const ln of new Set(
      v.description.split("\n").map((l) => l.trim()).filter(Boolean),
    )) {
      lineFreq.set(ln, (lineFreq.get(ln) ?? 0) + 1);
    }
  }
  const BOILERPLATE_MIN = 10;
  const boiler = new Set(
    [...lineFreq.entries()]
      .filter(([, n]) => n >= BOILERPLATE_MIN)
      .map(([l]) => l),
  );
  let strippedChars = 0;
  for (const v of videos) {
    const before = v.description.length;
    v.description = v.description
      .split("\n")
      .filter((l) => !boiler.has(l.trim()))
      .join("\n");
    strippedChars += before - v.description.length;
  }
  process.stdout.write(
    `Stripped ${boiler.size} boilerplate lines (${strippedChars.toLocaleString()} chars) ` +
      `from descriptions before matching.\n\n`,
  );

  const hits: Hit[] = [];
  for (const concept of CONCEPTS) {
    const matched: Video[] = [];
    let titleHits = 0;
    for (const v of videos) {
      const inTitle = concept.rx.test(v.title);
      const inDesc = concept.rx.test(v.description);
      if (inTitle || inDesc) {
        matched.push(v);
        if (inTitle) titleHits++;
      }
    }
    if (matched.length > 0) hits.push({ concept, videos: matched, titleHits });
  }

  hits.sort((a, b) => b.videos.length - a.videos.length);

  const out = (s: string) => process.stdout.write(s);
  const max = hits[0]?.videos.length ?? 0;

  out(`${"=".repeat(72)}\n`);
  out(`CONCEPT EXTRACTION — ${videos.length} videos scanned (title + description)\n`);
  out(`${"=".repeat(72)}\n\n`);

  out(`${"concept".padEnd(24)}${"vids".padStart(5)}${"title".padStart(6)}${"short".padStart(6)}${"long".padStart(5)}${"views".padStart(8)}\n`);
  out(`${"-".repeat(72)}\n`);
  for (const h of hits) {
    const shorts = h.videos.filter((v) => v.durationSec <= 60).length;
    const long = h.videos.length - shorts;
    const views = h.videos.reduce((s, v) => s + v.views, 0);
    out(
      h.concept.label.padEnd(24) +
        String(h.videos.length).padStart(5) +
        String(h.titleHits).padStart(6) +
        String(shorts).padStart(6) +
        String(long).padStart(5) +
        String(views).padStart(8) +
        "  " +
        bar(h.videos.length, max, 14) +
        "\n",
    );
  }

  // Page-worthiness tiers
  const tier1 = hits.filter((h) => h.videos.length >= 5);
  const tier2 = hits.filter((h) => h.videos.length >= 2 && h.videos.length < 5);
  const tier3 = hits.filter((h) => h.videos.length === 1);

  out(`\n${"=".repeat(72)}\nPAGE-WORTHINESS\n${"=".repeat(72)}\n`);
  out(`  Tier 1 (5+ videos) — ship immediately      ${tier1.length}\n`);
  out(`  Tier 2 (2-4 videos) — ship, thin           ${tier2.length}\n`);
  out(`  Tier 3 (1 video)   — hold, needs more      ${tier3.length}\n`);
  out(`  Concepts with zero coverage                ${CONCEPTS.length - hits.length}\n`);

  out(`\nTIER 1 — build these first:\n`);
  for (const h of tier1) {
    const views = h.videos.reduce((s, v) => s + v.views, 0);
    out(
      `  /playbook/${h.concept.slug.padEnd(22)} ${String(h.videos.length).padStart(3)} videos · ${String(views).padStart(6)} views · ${h.concept.family}\n`,
    );
  }

  // By family
  out(`\nBY FAMILY\n`);
  const fam = new Map<string, { concepts: number; videos: Set<string> }>();
  for (const h of hits) {
    const e = fam.get(h.concept.family) ?? { concepts: 0, videos: new Set() };
    e.concepts++;
    for (const v of h.videos) e.videos.add(v.videoId);
    fam.set(h.concept.family, e);
  }
  for (const [f, e] of [...fam.entries()].sort(
    (a, b) => b[1].videos.size - a[1].videos.size,
  )) {
    out(`  ${f.padEnd(20)}${String(e.concepts).padStart(3)} concepts · ${String(e.videos.size).padStart(3)} videos\n`);
  }

  // Coverage
  const covered = new Set<string>();
  for (const h of hits) for (const v of h.videos) covered.add(v.videoId);
  out(
    `\nCATALOG COVERAGE\n  ${covered.size}/${videos.length} videos (${Math.round(
      (covered.size / videos.length) * 100,
    )}%) mention at least one concept\n`,
  );

  await writeFile(
    "concept-extraction.json",
    JSON.stringify(
      hits.map((h) => ({
        slug: h.concept.slug,
        label: h.concept.label,
        family: h.concept.family,
        videoCount: h.videos.length,
        titleHits: h.titleHits,
        totalViews: h.videos.reduce((s, v) => s + v.views, 0),
        videos: h.videos.map((v) => ({
          videoId: v.videoId,
          title: v.title,
          durationSec: v.durationSec,
          views: v.views,
        })),
      })),
      null,
      2,
    ),
    "utf8",
  );
  out(`\nWrote concept-extraction.json\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
