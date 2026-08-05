/**
 * Fetch the Georgia roster from CFBD and cache it as roster-cfbd.json —
 * the ONLY source the pipeline seeds players from (title extraction runs at
 * ~35% precision and is banned as a player source; see lib/schema).
 *
 *   npx tsx --env-file=.env scripts/fetch-roster.ts
 *
 * Merges seasons by player id; a player on multiple rosters gets all their
 * years in rosterYears. CFBD ids are cached as strings (they are content,
 * not identity — see lib/schema rule 2).
 */
import { writeFile } from "node:fs/promises";
import { z } from "zod";
import { normalizePosition } from "../lib/schema";

const BASE = "https://api.collegefootballdata.com";
const TEAM = "Georgia";
/** Seasons the catalog spans (2023-2026 uploads breaking down these rosters). */
export const ROSTER_SEASONS = [2023, 2024, 2025] as const;
export const ROSTER_CACHE_FILE = "roster-cfbd.json";

const CfbdRosterEntry = z.object({
  id: z.coerce.string(),
  firstName: z.string().nullable().default(null),
  lastName: z.string().nullable().default(null),
  position: z.string().nullable().default(null),
  height: z.number().nullable().default(null),
  weight: z.number().nullable().default(null),
  homeCity: z.string().nullable().default(null),
  homeState: z.string().nullable().default(null),
  year: z.number().nullable().default(null),
});

export const RosterCacheSchema = z.object({
  fetchedAt: z.string(),
  team: z.string(),
  seasons: z.array(z.number()),
  players: z.array(
    z.object({
      cfbdId: z.string(),
      name: z.string(),
      cfbdPosition: z.string().nullable(),
      heightIn: z.number().nullable(),
      weightLb: z.number().nullable(),
      city: z.string().nullable(),
      state: z.string().nullable(),
      rosterYears: z.array(z.number()),
    }),
  ),
});
export type RosterCache = z.infer<typeof RosterCacheSchema>;

async function fetchSeason(year: number, key: string) {
  const res = await fetch(`${BASE}/roster?team=${TEAM}&year=${year}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`CFBD ${res.status} ${res.statusText}: ${body.slice(0, 200)}`);
  }
  return CfbdRosterEntry.array().parse(await res.json());
}

async function main() {
  const key = process.env.CFBD_API_KEY;
  if (!key) {
    console.error("Missing CFBD_API_KEY. See .env.example.");
    process.exit(1);
  }

  const byId = new Map<string, RosterCache["players"][number]>();
  for (const year of ROSTER_SEASONS) {
    const entries = await fetchSeason(year, key);
    console.log(`${year}: ${entries.length} roster entries`);
    for (const e of entries) {
      const name = [e.firstName, e.lastName].filter(Boolean).join(" ").trim();
      if (!name) continue;
      const existing = byId.get(e.id);
      if (existing) {
        if (!existing.rosterYears.includes(year)) existing.rosterYears.push(year);
        // Later seasons win for mutable facts (position moves, weight).
        existing.cfbdPosition = e.position ?? existing.cfbdPosition;
        existing.heightIn = e.height ?? existing.heightIn;
        existing.weightLb = e.weight ?? existing.weightLb;
      } else {
        byId.set(e.id, {
          cfbdId: e.id,
          name,
          cfbdPosition: e.position,
          heightIn: e.height,
          weightLb: e.weight,
          city: e.homeCity,
          state: e.homeState,
          rosterYears: [year],
        });
      }
    }
  }

  const players = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  const unmapped = players.filter(
    (p) => p.cfbdPosition && normalizePosition(p.cfbdPosition) === null,
  );
  if (unmapped.length) {
    console.warn(`⚠ ${unmapped.length} players with unmapped CFBD positions:`);
    for (const p of unmapped) console.warn(`   ${p.name}: ${p.cfbdPosition}`);
  }

  const cache: RosterCache = {
    fetchedAt: new Date().toISOString(),
    team: TEAM,
    seasons: [...ROSTER_SEASONS],
    players,
  };
  await writeFile(ROSTER_CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
  console.log(`Wrote ${ROSTER_CACHE_FILE}: ${players.length} distinct players`);
}

// Allow importing ROSTER_CACHE_FILE / RosterCacheSchema without fetching.
if (process.argv[1]?.endsWith("fetch-roster.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
