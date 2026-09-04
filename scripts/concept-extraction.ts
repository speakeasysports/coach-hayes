/**
 * One-off: find football concepts across the whole back catalog to size
 * /playbook/[concept].
 *
 * Reads catalog-analysis.json (run scripts/catalog-analysis.ts first).
 * The pattern lexicon lives in lib/ingest/lexicon.ts (shared with the\n * ingest pipeline). Scans BOTH titles and descriptions across all videos — not just the
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

import {
  LEXICON as CONCEPTS,
  BOILERPLATE_MIN,
  type LexiconEntry as Concept,
} from "../lib/ingest/lexicon";

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
