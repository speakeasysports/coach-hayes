// Sheet-backed Big Board data layer.
//
// Source of truth is a Google Sheet that Coach publishes to the web as CSV.
// We fetch the CSV server-side (5min cache + tag for on-demand invalidation),
// validate each row against the zod schema in ./types, and expose validated
// recruits to the Big Board page.
//
// Public surface:
//   getBoard()             → Recruit[] for the public page (errors logged)
//   getBoardDiagnostics()  → { recruits, errors } for /admin/refresh
//
// To force an immediate refresh after editing the sheet, call
// revalidateTag(BOARD_REVALIDATE_TAG) from a server action.

import { cache } from "react";
import { fetchBoard, BOARD_REVALIDATE_TAG } from "./sheet";
import type { BoardFetchResult } from "./sheet";
import type { Recruit } from "./types";

const fetchBoardCached = cache(fetchBoard);

export async function getBoard(): Promise<Recruit[]> {
  const { recruits, errors } = await fetchBoardCached();
  if (errors.length > 0) {
    // Surface to the server log so we can spot schema drift in dev.
    // Errors are also exposed via getBoardDiagnostics() for the admin UI.
    console.warn(`[board] ${errors.length} row(s) had issues:`);
    for (const e of errors.slice(0, 5)) {
      console.warn(`  row ${e.row}${e.name ? ` (${e.name})` : ""}: ${e.issue}`);
    }
  }
  return recruits;
}

export async function getBoardDiagnostics(): Promise<BoardFetchResult> {
  return fetchBoardCached();
}

export { BOARD_REVALIDATE_TAG };
export { POSITIONS, STATUSES } from "./types";
export type {
  Recruit,
  Position,
  Status,
} from "./types";
