/**
 * EDITABLE PAGE COPY — the registry.
 *
 * Every heading, paragraph and button label on the public pages that Coach can
 * change from /admin/content is declared here, with the text that ships in the
 * code as its default. The database (page_content) stores OVERRIDES ONLY.
 *
 * Why the registry is code and not data:
 *
 *   - A field only exists if some JSX reads its key. A database-defined field
 *     would have nowhere to render, and a renamed key would silently blank a
 *     page. Keeping both in the repo means the compiler catches the mismatch.
 *   - Defaults in code mean an empty table, a dropped row or a half-run
 *     migration still renders the site exactly as designed. For the homepage
 *     that is the difference between a deploy hiccup and a blank hero.
 *   - Clearing a field in the admin is therefore "revert to default", not
 *     "delete the text".
 *
 * Adding a field: add an entry here, read it through getCopy() in the page,
 * and it appears in the admin automatically. No migration.
 */

/** Which public surface a field belongs to. Drives the admin's grouping. */
export type CopyPageId =
  | "home"
  | "about"
  | "players"
  | "film"
  | "playbook"
  | "big-board";

export type CopyKind =
  /** Single line — rendered as an input. Headings, labels, buttons. */
  | "line"
  /** Multi-line — rendered as a textarea. Body paragraphs. */
  | "paragraph";

export type CopyField = {
  key: string;
  label: string;
  kind: CopyKind;
  fallback: string;
  /** Shown under the input in the admin. Say what the field does, not what it is. */
  help?: string;
  /** Soft cap surfaced as a counter. Meta descriptions really do get truncated. */
  maxLength?: number;
};

export type CopyPage = {
  id: CopyPageId;
  /** Name Coach would use for the page. */
  label: string;
  /** The URL this copy appears on — the admin links to it, and saving revalidates it. */
  path: string;
  fields: readonly CopyField[];
};

/**
 * `*emphasis*` inside a heading renders in brand red. Only the hero headline
 * uses it today; see emphasize() in components/site/emphasis.tsx.
 */
const EMPHASIS_HELP =
  "Wrap a word in *asterisks* to colour it red, the way “fundamentals” is styled today.";

export const COPY_PAGES = [
  {
    id: "home",
    label: "Home",
    path: "/",
    fields: [
      {
        key: "home.meta.description",
        label: "Search description",
        kind: "paragraph",
        maxLength: 160,
        help: "Shown under the title in Google results.",
        fallback:
          "X's & O's from a coach's perspective. Player breakdowns, recruit evaluations, and weekly college football film breakdowns.",
      },
      {
        key: "home.hero.headline",
        label: "Hero headline",
        kind: "line",
        help: EMPHASIS_HELP,
        fallback: "Connecting fans to the *fundamentals* of football.",
      },
      {
        key: "home.hero.subhead",
        label: "Hero paragraph",
        kind: "paragraph",
        fallback:
          "X’s & O’s from a coach’s perspective. Player breakdowns, recruit evaluations, and weekly college football film breakdowns.",
      },
      {
        key: "home.hero.primaryCta",
        label: "Main button",
        kind: "line",
        help: "Goes to the film room.",
        fallback: "Watch the breakdowns →",
      },
      {
        key: "home.hero.secondaryCta",
        label: "Second button",
        kind: "line",
        help: "Goes to the player index.",
        fallback: "Browse players",
      },
      {
        key: "home.latest.eyebrow",
        label: "Latest — small label",
        kind: "line",
        fallback: "Latest",
      },
      {
        key: "home.latest.heading",
        label: "Latest — heading",
        kind: "line",
        fallback: "New breakdowns",
      },
      {
        key: "home.cards.board.eyebrow",
        label: "Card 1 — small label",
        kind: "line",
        fallback: "Recruits",
      },
      {
        key: "home.cards.board.title",
        label: "Card 1 — heading",
        kind: "line",
        fallback: "Big Board",
      },
      {
        key: "home.cards.board.body",
        label: "Card 1 — paragraph",
        kind: "paragraph",
        fallback:
          "Every recruit by position with a film breakdown. Filter by status, class year, or position group.",
      },
      {
        key: "home.cards.board.cta",
        label: "Card 1 — link text",
        kind: "line",
        fallback: "Browse the board",
      },
      {
        key: "home.cards.playbook.eyebrow",
        label: "Card 2 — small label",
        kind: "line",
        fallback: "Game film",
      },
      {
        key: "home.cards.playbook.title",
        label: "Card 2 — heading",
        kind: "line",
        fallback: "Weekly Playbook",
      },
      {
        key: "home.cards.playbook.body",
        label: "Card 2 — paragraph",
        kind: "paragraph",
        fallback:
          "Georgia's installs, week by week. Plays grouped by formation, each one linked to a film breakdown.",
      },
      {
        key: "home.cards.playbook.cta",
        label: "Card 2 — link text",
        kind: "line",
        fallback: "Open the playbook",
      },
      {
        key: "home.cards.channel.eyebrow",
        label: "Card 3 — small label",
        kind: "line",
        fallback: "Watch",
      },
      {
        key: "home.cards.channel.title",
        label: "Card 3 — heading",
        kind: "line",
        fallback: "Latest video & podcast",
      },
      {
        key: "home.cards.channel.body",
        label: "Card 3 — paragraph",
        kind: "paragraph",
        fallback:
          "New breakdowns weekly on YouTube, plus the podcast on Spotify and Apple. Subscribe so you don't miss the install.",
      },
      {
        key: "home.cards.channel.cta",
        label: "Card 3 — link text",
        kind: "line",
        fallback: "Open the channel",
      },
      {
        key: "home.support.eyebrow",
        label: "Patreon — small label",
        kind: "line",
        fallback: "Go deeper",
      },
      {
        key: "home.support.heading",
        label: "Patreon — heading",
        kind: "line",
        fallback: "The full install, on Patreon",
      },
      {
        key: "home.support.body",
        label: "Patreon — paragraph",
        kind: "paragraph",
        help: "The pitch. Say what a supporter gets that a visitor doesn't.",
        fallback:
          "Everything on this site stays free. The deeper installs and the play-by-play film studies — the ones that take a whole evening to cut — live on Patreon.",
      },
      {
        key: "home.support.cta",
        label: "Patreon — button",
        kind: "line",
        fallback: "Support on Patreon",
      },
    ],
  },
  {
    id: "about",
    label: "About",
    path: "/about",
    fields: [
      {
        key: "about.meta.description",
        label: "Search description",
        kind: "paragraph",
        maxLength: 160,
        fallback:
          "Coach Hayes is a 20-year high school football coach providing X's and O's analysis from a coach's perspective. Based in Calhoun, Georgia.",
      },
      {
        key: "about.eyebrow",
        label: "Small label",
        kind: "line",
        fallback: "About",
      },
      { key: "about.title", label: "Heading", kind: "line", fallback: "Coach Hayes Hudl" },
      {
        key: "about.tagline",
        label: "Tagline",
        kind: "line",
        fallback: "Connecting fans to the fundamentals of football.",
      },
      {
        key: "about.body1",
        label: "First paragraph",
        kind: "paragraph",
        fallback:
          "Coach Hayes is a 20-year high school football coach based in Calhoun, Georgia. He produces in-depth coaching analysis, player breakdowns, and recruit evaluations from a coach’s perspective — with an emphasis on UGA.",
      },
      {
        key: "about.body2",
        label: "Second paragraph",
        kind: "paragraph",
        fallback:
          "The channel covers offensive, defensive, and special-teams schemes across college football, with weekly breakdowns drawn from real installs and real game film. The deeper installs and play-by-play film studies live on Patreon; everything else is on YouTube and the podcast.",
      },
      {
        key: "about.primaryCta",
        label: "Main button",
        kind: "line",
        fallback: "Watch the breakdowns →",
      },
      {
        key: "about.secondaryCta",
        label: "Second button",
        kind: "line",
        fallback: "Support on Patreon",
      },
    ],
  },
  {
    id: "players",
    label: "Players",
    path: "/players",
    fields: [
      {
        key: "players.meta.description",
        label: "Search description",
        kind: "paragraph",
        maxLength: 160,
        fallback:
          "Every Georgia player Coach Hayes has broken down on film, grouped by position.",
      },
      { key: "players.eyebrow", label: "Small label", kind: "line", fallback: "Film room" },
      { key: "players.heading", label: "Heading", kind: "line", fallback: "Players" },
      {
        key: "players.intro",
        label: "Intro line",
        kind: "paragraph",
        help: "The player and breakdown counts are added after this automatically.",
        fallback: "Every Georgia player broken down on film, grouped by position.",
      },
      {
        key: "players.empty",
        label: "Empty state",
        kind: "paragraph",
        help: "Only shown if no player has published film.",
        fallback: "Film breakdowns are being indexed. Check back soon.",
      },
    ],
  },
  {
    id: "film",
    label: "Film",
    path: "/film",
    fields: [
      {
        key: "film.meta.description",
        label: "Search description",
        kind: "paragraph",
        maxLength: 160,
        fallback:
          "Every Coach Hayes film breakdown — Georgia players, schemes and situations, newest first.",
      },
      { key: "film.eyebrow", label: "Small label", kind: "line", fallback: "Film room" },
      { key: "film.heading", label: "Heading", kind: "line", fallback: "Film" },
      {
        key: "film.intro",
        label: "Intro line",
        kind: "paragraph",
        help: "The breakdown count is added after this automatically.",
        fallback: "Every full breakdown, grouped by series.",
      },
      {
        key: "film.ungrouped",
        label: "Catch-all group heading",
        kind: "line",
        help: "The heading over films with no series assigned. Always sorted last.",
        fallback: "Other breakdowns",
      },
      {
        key: "film.empty",
        label: "Empty state",
        kind: "paragraph",
        fallback: "Breakdowns are being indexed. Check back soon.",
      },
    ],
  },
  {
    id: "playbook",
    label: "Playbook",
    path: "/playbook",
    fields: [
      {
        key: "playbook.meta.description",
        label: "Search description",
        kind: "paragraph",
        maxLength: 160,
        fallback:
          "Every scheme and concept Coach Hayes breaks down on film — run game, pass game, coverage, fronts and technique.",
      },
      {
        key: "playbook.eyebrow",
        label: "Small label",
        kind: "line",
        fallback: "X’s & O’s",
      },
      { key: "playbook.heading", label: "Heading", kind: "line", fallback: "Playbook" },
      {
        key: "playbook.intro",
        label: "Intro line",
        kind: "paragraph",
        help: "The concept count is added after this automatically.",
        fallback: "Every concept broken down on film, grouped by what it does.",
      },
      {
        key: "playbook.empty",
        label: "Empty state",
        kind: "paragraph",
        fallback: "Concepts are being indexed. Check back soon.",
      },
    ],
  },
  {
    id: "big-board",
    label: "Big Board",
    path: "/big-board",
    fields: [
      {
        key: "bigBoard.meta.description",
        label: "Search description",
        kind: "paragraph",
        maxLength: 160,
        fallback:
          "Every Georgia recruit Coach Hayes is tracking, by position — each name linked to a film breakdown.",
      },
      { key: "bigBoard.eyebrow", label: "Small label", kind: "line", fallback: "Recruits" },
      {
        key: "bigBoard.heading",
        label: "Heading",
        kind: "line",
        fallback: "The Big Board",
      },
      {
        key: "bigBoard.intro",
        label: "Intro line",
        kind: "paragraph",
        help: "The board count is added after this automatically.",
        fallback: "Every recruit Coach is tracking, by position.",
      },
      {
        key: "bigBoard.empty.heading",
        label: "Empty board — heading",
        kind: "line",
        help: "What visitors see until the first recruits are imported.",
        fallback: "The Big Board is being built",
      },
      {
        key: "bigBoard.empty.body",
        label: "Empty board — paragraph",
        kind: "paragraph",
        fallback:
          "Coach is loading the first set of recruits. In the meantime, the film room is open.",
      },
      {
        key: "bigBoard.noMatches",
        label: "No filter matches",
        kind: "line",
        fallback: "No recruits match these filters.",
      },
    ],
  },
] as const satisfies readonly CopyPage[];

/** Every editable key, as a union — so a typo in a page is a compile error. */
export type CopyKey = (typeof COPY_PAGES)[number]["fields"][number]["key"];

/** Resolved copy: every key present, override applied or default used. */
export type Copy = Record<CopyKey, string>;

// `as const` makes each page's `fields` a tuple, and flatMap over tuples
// infers a union of tuple types rather than a plain array — widen once here.
const ALL_FIELDS: readonly CopyField[] = COPY_PAGES.flatMap(
  (p) => p.fields as readonly CopyField[],
);

export const COPY_FIELDS_BY_KEY: ReadonlyMap<string, CopyField> = new Map(
  ALL_FIELDS.map((f) => [f.key, f]),
);

export function copyPage(id: string): CopyPage | undefined {
  return (COPY_PAGES as readonly CopyPage[]).find((p) => p.id === id);
}

/** Defaults for every key. The shape getCopy() starts from. */
export function defaultCopy(): Copy {
  return Object.fromEntries(ALL_FIELDS.map((f) => [f.key, f.fallback])) as Copy;
}

/**
 * Apply stored overrides over the defaults. An override that is blank, or that
 * matches the default, is ignored — the two states are the same thing, and
 * treating them alike keeps a stale row from pinning old text forever.
 */
export function resolveCopy(overrides: Iterable<[string, string]>): Copy {
  const out = defaultCopy();
  for (const [key, value] of overrides) {
    const field = COPY_FIELDS_BY_KEY.get(key);
    if (!field) continue; // key retired from the registry; row is inert
    const trimmed = value.trim();
    if (trimmed) (out as Record<string, string>)[key] = trimmed;
  }
  return out;
}
