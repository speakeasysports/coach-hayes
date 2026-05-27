# Coach Hayes Hudl

Companion site for [Coach Hayes Hudl](https://www.youtube.com/@CoachHayesHudl) —
X's & O's from a coach's perspective, with an emphasis on UGA. Built on Next.js
16 (React 19, Tailwind 4). Brand and content references live in
[`BRAND-KIT.md`](./BRAND-KIT.md); agent-facing rules live in
[`AGENTS.md`](./AGENTS.md).

## Build status (as of 2026-05-25)

| Phase | Status | Notes |
|---|---|---|
| Phase 1 — site scaffold | shipped | Layout, header/footer, hero, latest-videos via YouTube RSS, About, ComingSoon stubs. |
| Phase 2 — content data layer | shipped | Zod-validated file-backed recruits + plays, `content.*` repository, `npm run validate:content`. Still used by Plays. |
| Phase 3 — Big Board | shipped | `app/big-board/page.tsx` reads a Google Sheet published-to-web as CSV (see [Big Board](#big-board) below). Cards show stars, height/weight, school, status, and a film thumbnail. Coach toggles the Published column to control what appears. |
| Phase 3.5 — Big Board admin | shipped | `app/admin/refresh` shows a "Refresh now" button + per-row validation errors. URL is unlinked from public nav. |
| Phase 4 — Playbook | not started | Plays index + per-play pages off the file-backed content layer. |
| Phase 5 — Newsletter | not started | Real provider embed deferred (see `BRAND-KIT.md`). |

## Repo map

```
app/                    Next.js 16 app router pages
  big-board/page.tsx    Phase 3 — recruit board, reads from lib/board
  admin/refresh/        Phase 3.5 — refresh button + sheet diagnostics
  playbook/             Phase 4 stub
  about/                static
components/site/        site-specific UI
  filter-bar.tsx        faceted status + class chips for the Big Board
  recruit-card.tsx      recruit card with stars, HW, school, status, film thumb
  coming-soon.tsx       phase placeholder
  header.tsx, footer.tsx, latest-videos.tsx, social-icon.tsx
lib/
  board/                sheet-backed Big Board (Phase 3)
    types.ts            Zod schema — Recruit, Position, Status
    csv.ts              minimal RFC-4180 CSV parser
    sheet.ts            fetch + parse + validate; Next.js cache + tag
    index.ts            getBoard(), getBoardDiagnostics(), BOARD_REVALIDATE_TAG
  content/              file-backed plays repository (Phase 4, still used)
    types.ts, queries.ts, file-repository.ts, repository.ts, index.ts
  cfbd/                 CFBD recruit data layer (scaffolded, dormant — see header)
    types.ts, client.ts, index.ts
  youtube.ts            RSS-based latest-videos, thumbnail helpers, URL → ID parser
  links.ts              channel IDs, nav, social link table
content/
  plays/<slug>.json     one play per file (empty so far)
scripts/
  validate-content.ts   zod-validates every JSON file in /content
  match-youtube.ts      one-off: match YouTube uploads to roster (see below)
  cfbd-lookup.ts        one-off: probe CFBD by year + name for ID capture
  board-parse-test.ts   one-off: sanity test the sheet CSV parser
```

## Commands

```bash
npm run dev               # next dev — default :3000, pass -p 4000 for alt port
npm run build             # production build
npm run lint              # eslint
npm run validate:content  # check every /content JSON against the Zod schemas
npm run match:youtube     # YouTube → roster match sheet (see below)
```

## Big Board

The Big Board is sourced from a Google Sheet that Coach edits directly.
Published rows render as cards on `/big-board`; unpublished rows are hidden.

### Sheet shape

The sheet **must** have these column headers in the first row (case-insensitive
match, any order):

| Column | Type | Notes |
|---|---|---|
| `Published` | checkbox | `TRUE` / `Yes` / `1` / `✓` all count as published; anything else hides the row |
| `Position` | enum | one of `QB`, `RB`, `WR`, `TE`, `OL`, `DL`, `LB`, `DB`, `ATH`, `K`, `P` |
| `Player Name` | text | required |
| `Class` | year | 2024–2035 |
| `Star Rating` | 0–5 | blank renders as no stars |
| `Height` | text | e.g. `6'3"` — passed through as-is |
| `Weight` | lb | integer; non-numeric chars stripped |
| `High School` | text | |
| `Status` | enum | `Uncommitted` or `Committed` |
| `Committed Team` | text | required when Status is `Committed` |
| `Video URL` | YouTube URL or 11-char ID | parsed by `parseYouTubeId` in `lib/youtube.ts` |

Rows that fail validation are skipped and surfaced on `/admin/refresh` with
the row number and the specific Zod issue.

### Setup

1. Create a Google Sheet with the headers above.
2. **File → Share → Publish to web → choose the tab → CSV → Publish**.
   Copy the long URL Google gives you.
3. Paste it into `.env` as `SHEET_CSV_URL=…`.
4. Optionally set `SHEET_EDIT_URL=…` to the regular edit URL (the one in your
   browser). The `/admin/refresh` page will show an "Open the Google Sheet"
   button when this is set.

### How updates propagate

- The site caches the CSV for **5 minutes** server-side. Edits in the sheet
  appear within that window automatically.
- For an immediate update, visit `/admin/refresh` and click **Refresh now** —
  it calls `revalidateTag('board-sheet')` and re-renders `/big-board` on the
  next request.

### Code surface

```ts
import { getBoard, getBoardDiagnostics } from "@/lib/board";

const recruits = await getBoard();                // validated + published only
const { recruits, errors } = await getBoardDiagnostics(); // for admin UI
```

`getBoard` is wrapped in React `cache()` so multiple components in one render
share a single fetch + parse pass.

## Plays (Phase 4, file-backed)

Plays still live as one JSON file per entity under `content/plays/`, validated
against `PlaySchema` in `lib/content/types.ts`:

```bash
npm run validate:content
```

Page code reads through `content`:

```ts
import { content } from "@/lib/content";
const plays = await content.getPlays();
```

## YouTube → roster match sheet

`scripts/match-youtube.ts` is a one-off that pulls every Coach Hayes upload
(YouTube Data API v3, paginated through the uploads playlist + a batched
`videos.list` for full descriptions) and scores each recruit on the 2027 Big
Board against video titles and descriptions. It writes
`youtube-matches.csv` for human review — **it never modifies the Google
Sheet**.

Setup:

```bash
cp .env.example .env
# fill in YOUTUBE_API_KEY (Google Cloud Console → YouTube Data API v3, Public Data)
npm run match:youtube
```

Scoring (last name is the strong signal; first initial is a tiebreaker):

| Score | Meaning |
|---|---|
| 100 | Full first + last name in title (auto-confident) |
| 78 | Last name in title with matching initial adjacent |
| 70 | Last name in title only |
| 65 | Last name in title with matching initial anywhere |
| 60 | Full first + last name in description |
| 45 | Last name in description only |
| 35 / 20 | Partial match on one segment of a hyphenated surname |
| 0 | No surname match anywhere |

A row is flagged `[NEEDS REVIEW]` when confidence < 80, and `[AMBIGUOUS — verify
position]` when the roster contains another recruit with the same surname (the
two J Thompson, D Haley, E Hauser, K/KJ Caldwell, MJ/M Knight, etc.). The CSV
is sorted lowest-confidence first so problem rows surface immediately.

Roster lives inline in the script — it's deliberately self-contained because
the 2027 board lives in the Google Sheet CMS and this script doesn't read the
Sheet. Update both sides manually if the roster changes.

API quota cost per run: ~1 (channels.list) + N (playlistItems, 1 per page of
50) + N (videos.list, 1 per batch of 50) ≈ 20 units for ~500 videos. Free tier
is 10,000 units/day.

## Environment

`.env.example` documents every variable. Currently only the match script needs
env — the running app uses public RSS.

| Variable | Used by | Notes |
|---|---|---|
| `YOUTUBE_API_KEY` | `scripts/match-youtube.ts` | YouTube Data API v3 read-only |
| `CHANNEL_HANDLE` | `scripts/match-youtube.ts` | Defaults to `@CoachHayesHudl` |

`.env*` is gitignored except `.env.example`; generated `youtube-matches.csv`
is also gitignored.

## Next.js version note

This is Next.js 16, not what most LLM training data assumes. See `AGENTS.md`
and the bundled docs under `node_modules/next/dist/docs/` before changing
routing, server components, or `searchParams` behavior. `app/big-board/page.tsx`
shows the async-`searchParams` pattern in use.
