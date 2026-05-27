// CollegeFootballData recruit data layer.
//
// Scaffolded but NOT YET CONSUMED by the Big Board. CFBD covers signed classes
// well (2025, 2026) but the active recruiting cycle (2027 as of writing) is
// not populated yet — they wait until the major ranking services publish. The
// Big Board currently targets 2027 prospects, so wiring this layer in would
// produce empty results.
//
// When CFBD adds 2027 (or whatever the active cycle is at the time):
//   1. Verify via `LOOKUP_YEAR=2027 npx tsx --env-file=.env scripts/cfbd-lookup.ts`
//   2. Resume Phase B (slim editorial schema) and Phase C (Big Board enrichment).
//
// In the meantime this layer is safe to import; nothing breaks if it's unused.
import { cache } from "react";
import { fetchRecruitingClass, tagForClass } from "./client";
import type { CfbdRecruit } from "./types";

export const getRecruitingClass = cache(
  async (year: number): Promise<CfbdRecruit[]> => {
    return fetchRecruitingClass(year);
  },
);

export async function getRecruit(
  cfbdId: string,
  year: number,
): Promise<CfbdRecruit | null> {
  const all = await getRecruitingClass(year);
  return all.find((r) => r.id === cfbdId) ?? null;
}

export async function searchClass(
  query: string,
  year: number,
  limit = 50,
): Promise<CfbdRecruit[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all = await getRecruitingClass(year);
  const hits: CfbdRecruit[] = [];
  for (const r of all) {
    if (
      r.name.toLowerCase().includes(q) ||
      r.school?.toLowerCase().includes(q) ||
      r.committedTo?.toLowerCase().includes(q)
    ) {
      hits.push(r);
      if (hits.length >= limit) break;
    }
  }
  return hits;
}

export type { CfbdRecruit, CfbdRecruitType } from "./types";
export { tagForClass };
