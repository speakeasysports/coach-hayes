/**
 * Validate lib/schema against the REAL back catalog, not toy fixtures.
 * Maps catalog-analysis.json + concept-extraction.json into schema shape and
 * checks all 455 videos parse, then exercises the derivation rules.
 *
 *   npx tsx scripts/schema-fit-test.ts
 */
import { readFile } from "node:fs/promises";
import { z } from "zod";
import {
  VideoSchema,
  PlayerSchema,
  ConceptSchema,
  deriveFormat,
  hasFilmPage,
  derivePositionGroups,
  tagOutcome,
  tagDestination,
  positionGroupFromSlug,
  TopicSchema,
  type Player,
  type PositionGroup,
} from "../lib/schema";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

async function main() {
  const cat = JSON.parse(await readFile("catalog-analysis.json", "utf8"));
  const concepts = JSON.parse(
    await readFile("concept-extraction.json", "utf8"),
  );
  const videos: Array<{
    videoId: string;
    title: string;
    description: string;
    publishedAt: string;
    durationSec: number;
    views: number;
    names: string[];
  }> = cat.videos;

  // concept slug → set of videoIds
  const conceptsByVideo = new Map<string, string[]>();
  for (const c of concepts) {
    for (const v of c.videos) {
      conceptsByVideo.set(v.videoId, [
        ...(conceptsByVideo.get(v.videoId) ?? []),
        c.slug,
      ]);
    }
  }

  // ---- Videos -------------------------------------------------------------
  const seenSlugs = new Map<string, number>();
  let ok = 0;
  const failures: { id: string; title: string; issue: string }[] = [];

  for (const v of videos) {
    let slug = slugify(v.title);
    if (!slug) slug = `video-${v.videoId.toLowerCase()}`;
    const n = seenSlugs.get(slug) ?? 0;
    seenSlugs.set(slug, n + 1);
    const uniqueSlug = n === 0 ? slug : `${slug}-${n + 1}`;

    const candidate = {
      youtubeId: v.videoId,
      slug: uniqueSlug,
      title: v.title,
      description: v.description,
      publishedAt: v.publishedAt,
      durationSec: v.durationSec,
      views: v.views,
      players: v.names.map(slugify).filter(Boolean),
      concepts: conceptsByVideo.get(v.videoId) ?? [],
      autoTagged: true,
      tagConfidence: v.names.length > 0 ? 85 : 0,
      published: true,
    };

    const r = VideoSchema.safeParse(candidate);
    if (r.success) ok++;
    else
      failures.push({
        id: v.videoId,
        title: v.title.slice(0, 50),
        issue: z.prettifyError(r.error).replace(/\n/g, " | "),
      });
  }

  console.log(`VIDEOS   ${ok}/${videos.length} parsed`);
  if (failures.length) {
    console.log(`  ${failures.length} failures (first 5):`);
    for (const f of failures.slice(0, 5))
      console.log(`   [${f.id}] ${f.title}\n     ${f.issue}`);
  }

  // slug collisions
  const collisions = [...seenSlugs.entries()].filter(([, n]) => n > 1);
  console.log(
    `SLUGS    ${seenSlugs.size} unique base slugs, ${collisions.length} needed a suffix`,
  );

  // ---- Derivation rules ---------------------------------------------------
  const longform = videos.filter((v) => hasFilmPage(v));
  const shorts = videos.filter((v) => deriveFormat(v.durationSec) === "short");
  console.log(
    `FORMAT   ${longform.length} long-form get /film pages · ${shorts.length} shorts aggregate only`,
  );

  // derivePositionGroups against a synthetic roster
  const roster = new Map<string, Pick<Player, "position">>([
    ["carson-beck", { position: "QB" }],
    ["dajun-edwards", { position: "RB" }],
    ["malaki-starks", { position: "DB" }],
  ]);
  const derived = derivePositionGroups(
    {
      players: ["carson-beck", "dajun-edwards", "unknown-guy"],
      positionGroupsOverride: ["WR"] as PositionGroup[],
    },
    roster,
  );
  const expected = new Set(["WR", "QB", "RB"]);
  const derivedOk =
    derived.length === 3 && derived.every((g) => expected.has(g));
  console.log(
    `DERIVE   positionGroups → [${derived.join(", ")}]  ${derivedOk ? "OK" : "MISMATCH"}`,
  );

  // tagOutcome
  const outcomes = {
    "auto-published": tagOutcome(85, true),
    "needs-review": tagOutcome(70, true),
    unmatched: tagOutcome(0, false),
  };
  const tagOk = Object.entries(outcomes).every(([k, v]) => k === v);
  console.log(
    `TAGS     ${Object.values(outcomes).join(" · ")}  ${tagOk ? "OK" : "MISMATCH"}`,
  );

  // ---- Extraction routing -------------------------------------------------
  // The flat extraction list spans three destinations. Fan them out and check
  // every tag lands somewhere valid — nothing may be silently dropped.
  const routed = { concept: 0, topic: 0, "position-group": 0 };
  const dropped: string[] = [];
  let cOk = 0;

  for (const c of concepts) {
    const dest = tagDestination(c.family);
    routed[dest]++;

    if (dest === "concept") {
      const r = ConceptSchema.safeParse({
        slug: c.slug,
        label: c.label,
        family: c.family,
        matchPatterns: [],
      });
      if (r.success) cOk++;
      else dropped.push(`concept ${c.slug}: ${z.prettifyError(r.error)}`);
    } else if (dest === "topic") {
      if (!TopicSchema.safeParse(c.slug).success)
        dropped.push(`topic "${c.slug}" (${c.family}) not in TOPICS enum`);
    } else {
      if (positionGroupFromSlug(c.slug) === null)
        dropped.push(`position group "${c.slug}" has no mapping`);
    }
  }

  console.log(
    `ROUTING  ${routed.concept} concepts · ${routed.topic} topics · ` +
      `${routed["position-group"]} position groups`,
  );
  console.log(`CONCEPTS ${cOk}/${routed.concept} parsed`);
  if (dropped.length) {
    console.log(`  ${dropped.length} tag(s) with nowhere to land:`);
    for (const d of dropped.slice(0, 10)) console.log(`   ${d}`);
  }

  // ---- Player sample ------------------------------------------------------
  const p = PlayerSchema.safeParse({
    slug: "carson-beck",
    name: "Carson Beck",
    aliases: ["C Beck", "Beck"],
    position: "QB",
    classYear: 2026,
    status: "signed",
  });
  console.log(
    `PLAYER   sample ${p.success ? "OK" : "FAIL: " + z.prettifyError(p.error)}`,
  );

  const allGood =
    failures.length === 0 &&
    derivedOk &&
    tagOk &&
    dropped.length === 0 &&
    cOk === routed.concept &&
    p.success;
  console.log(`\n${allGood ? "✓ schema fits the real catalog" : "✗ issues above"}`);
  if (!allGood) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
