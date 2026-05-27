/**
 * One-off: look up the two existing recruits in CFBD's 2027 class and print
 * their CFBD IDs so we can rekey content/recruits/*.json by cfbdId.
 *
 *   npx tsx --env-file=.env scripts/cfbd-lookup.ts
 */
import { fetchRecruitingClass } from "../lib/cfbd/client";

const YEAR = Number(process.env.LOOKUP_YEAR ?? 2026);

// Existing editorial records — match by last name (case-insensitive) and
// optionally first-initial. Edit this list to look up others.
const TARGETS = [
  { slug: "jaxon-dollar", lastName: "Dollar", firstInitial: "J" },
  { slug: "nick-peal", lastName: "Peal", firstInitial: "N" },
];

function inchesToFeet(n: number | null): string {
  if (n == null) return "—";
  return `${Math.floor(n / 12)}'${n % 12}"`;
}

async function main() {
  console.log(`Fetching CFBD ${YEAR} HS class…`);
  const all = await fetchRecruitingClass(YEAR);
  console.log(`  → ${all.length} recruits returned\n`);

  for (const target of TARGETS) {
    const last = target.lastName.toLowerCase();
    const matches = all.filter((r) => {
      const tokens = r.name.toLowerCase().split(/\s+/);
      if (!tokens.includes(last)) return false;
      if (!target.firstInitial) return true;
      const first = tokens[0] ?? "";
      return first.charAt(0).toLowerCase() === target.firstInitial.toLowerCase();
    });

    console.log(`# ${target.slug} (${target.firstInitial} ${target.lastName})`);
    if (matches.length === 0) {
      console.log("  no match found in CFBD\n");
      continue;
    }
    for (const m of matches) {
      console.log(`  id=${m.id}  ${m.name}`);
      console.log(
        `    pos=${m.position ?? "?"}  stars=${m.stars ?? "NR"}  rank=${
          m.ranking ?? "?"
        }  rating=${m.rating ?? "?"}`,
      );
      console.log(
        `    ${inchesToFeet(m.height)}, ${m.weight ?? "?"}lb  ${
          m.school ?? "?"
        } (${m.city ?? "?"}, ${m.stateProvince ?? "?"})`,
      );
      console.log(`    committedTo=${m.committedTo ?? "uncommitted"}`);
    }
    console.log();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
