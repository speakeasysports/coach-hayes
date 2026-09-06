/**
 * The site says "breakdown" and "clip" in a lot of places, and for a while it
 * said them inconsistently: a player card promised "8 breakdowns" and the page
 * behind it delivered 1 breakdown and 7 clips, while a position hub printed
 * "14 breakdowns" in its header (long-form) directly above player chips
 * counting 20 (everything). One vocabulary, defined once:
 *
 *   breakdown = long-form film, has its own /film/[slug] page
 *   clip      = a short, aggregates onto player and concept hubs
 */

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/**
 * "1 breakdown · 7 clips", dropping whichever half is zero. Returns "" when
 * both are — callers decide what an empty player looks like.
 */
export function filmCountLabel(filmCount: number, clipCount: number): string {
  const parts: string[] = [];
  if (filmCount > 0) parts.push(plural(filmCount, "breakdown"));
  if (clipCount > 0) parts.push(plural(clipCount, "clip"));
  return parts.join(" · ");
}

/** The same counts as a compact "1 · 7" pair for chips, with a real label for AT. */
export function filmCountTitle(filmCount: number, clipCount: number): string {
  return filmCountLabel(filmCount, clipCount) || "No published film";
}
