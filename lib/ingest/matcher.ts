/**
 * Roster → video player matching.
 *
 * Scoring is ported from scripts/match-youtube.ts (kept identical so the
 * hand-reviewed youtube-matches.csv numbers stay comparable), then filtered
 * by the contract in lib/schema:
 *
 *   - SURNAME_STOPLIST surnames are skipped outright (measured false
 *     positives: "hayes" 221, "short" 78, "brock" 12).
 *   - Surnames shared by 2+ roster players require a first-name signal —
 *     scores that rest on the last name alone are dropped, not just capped.
 *   - Links below LINK_MIN_SCORE are dropped; everything kept feeds the
 *     video's tagConfidence, and anything under AUTO_PUBLISH_CONFIDENCE
 *     lands in the review queue.
 *
 * Players are matched from the SEEDED roster only — the matcher can never
 * invent a player from a string (measured ~35% precision doing that).
 */
import { findAmbiguousSurnames, nameTokens, SURNAME_STOPLIST } from "../schema";

/** Score floor for persisting a video↔player link at all. */
export const LINK_MIN_SCORE = 60;
/** Minimum score that implies a first-name signal (100 or 78). */
export const FIRST_NAME_SIGNAL_MIN = 78;

export type MatchInput = { title: string; description: string };
export type Match = { playerId: number; score: number };

type Parsed = {
  firstToken: string;
  firstInitial: string;
  firstIsInitials: boolean;
  lastName: string;
  lastTokens: string[];
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

function parseName(name: string): Parsed | null {
  // Suffix-aware: "Anthony Evans III" must parse as Evans, not III.
  const parts = nameTokens(name);
  if (parts.length === 0 || !parts[0]) return null;
  const last = parts[parts.length - 1];
  const firstRaw = parts.slice(0, -1).join(" ");
  const firstIsInitials =
    parts.length === 2 && /^[A-Z]{1,3}$/.test(parts[0]);
  const firstToken = clean(firstRaw);
  return {
    firstToken,
    firstInitial: firstToken[0] ?? "",
    firstIsInitials,
    lastName: clean(last),
    lastTokens: clean(last).split("-").filter(Boolean),
  };
}

/**
 * Last name = strong signal; first name/initial = tiebreaker.
 * 100 full name in title · 78 last + adjacent initial match · 70 last in
 * title only · 65 last + initial somewhere · 60 last in desc + full first ·
 * 45 last in desc only · 35/20 partial hyphenated surname.
 */
function score(p: Parsed, titleTokens: string[], descTokens: string[]): number {
  const lastIn = (toks: string[]): boolean => {
    if (toks.includes(p.lastName)) return true;
    if (p.lastTokens.length > 1 && p.lastTokens.every((t) => toks.includes(t)))
      return true;
    return false;
  };

  const lastInTitle = lastIn(titleTokens);
  const lastInDesc = lastIn(descTokens);

  if (!lastInTitle && !lastInDesc) {
    if (p.lastTokens.length > 1) {
      if (p.lastTokens.some((t) => titleTokens.includes(t))) return 35;
      if (p.lastTokens.some((t) => descTokens.includes(t))) return 20;
    }
    return 0;
  }

  const fullFirstInTitle =
    !p.firstIsInitials && !!p.firstToken && titleTokens.includes(p.firstToken);
  const fullFirstInDesc =
    !p.firstIsInitials && !!p.firstToken && descTokens.includes(p.firstToken);

  let initialAdjacent = false;
  let initialSomewhere = false;
  if (p.firstInitial) {
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
    // Initial-only signals stay under AUTO_PUBLISH_CONFIDENCE (80): with only
    // an initial we can't distinguish "C Nussmeier → Cade Nussmeier" from
    // coincidences without a human check.
    if (initialAdjacent) return 78;
    if (initialSomewhere) return 65;
    return 70;
  }
  if (fullFirstInDesc) return 60;
  return 45;
}

export type RosterPlayer = {
  playerId: number;
  name: string;
  aliases: string[];
};

export function buildMatcher(
  roster: ReadonlyArray<RosterPlayer>,
): (video: MatchInput) => Match[] {
  const ambiguous = findAmbiguousSurnames(roster);

  const candidates = roster.map((p) => ({
    playerId: p.playerId,
    forms: [p.name, ...p.aliases]
      .map(parseName)
      .filter((f): f is Parsed => f !== null)
      .filter((f) => !SURNAME_STOPLIST.has(f.lastName)),
  }));

  return (video) => {
    const titleTokens = tokenize(video.title);
    const descTokens = tokenize(video.description);
    const out: Match[] = [];

    for (const cand of candidates) {
      let best = 0;
      for (const form of cand.forms) {
        let s = score(form, titleTokens, descTokens);
        // Shared surname → last name alone proves nothing. Require a
        // first-name signal; otherwise discard the match entirely.
        if (ambiguous.has(form.lastName) && s < FIRST_NAME_SIGNAL_MIN) s = 0;
        if (s > best) best = s;
      }
      if (best >= LINK_MIN_SCORE) out.push({ playerId: cand.playerId, score: best });
    }
    return out;
  };
}
