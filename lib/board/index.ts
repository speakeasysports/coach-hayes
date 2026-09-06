// Sheet CSV parsing for the admin's Big Board import.
//
// This used to be a LIVE data source: /big-board fetched the published CSV on
// every render. That made the board vanish whenever SHEET_CSV_URL was unset,
// and nothing in the admin could fix it, because the admin wrote to the
// database and the page read the sheet.
//
// The sheet is now an import FORMAT, not a dependency. /big-board reads the
// database (getBigBoard in lib/db/public.ts); this module only parses a CSV
// on its way in.
export { parseBoardCsv } from "./sheet";
export type { BoardFetchResult, BoardRowError } from "./sheet";
export { POSITIONS, STATUSES } from "./types";
export type { Recruit, Position, Status } from "./types";
