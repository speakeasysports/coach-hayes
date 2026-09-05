/**
 * Google Sheet -> database import.
 *
 * The sheet is an INPUT, not the source of truth. Coach drafts the board in
 * Sheets, pulls it in, and from then on the database is authoritative. That
 * inversion is the whole point: admin edits survive, and the board does not
 * empty out if the sheet URL breaks.
 *
 * Three shape mismatches have to be resolved on the way in, and each is a
 * place where a silent failure would be easy:
 *
 *   Height    sheet is text (6'3"), Player.heightIn is a number
 *   Status    sheet has 2 values, PlayerStatus has 15
 *   Video URL is not a Player field at all -- it is a video association
 */
import type { Recruit } from "./types";
import type { PlayerStatus, Position } from "@/lib/schema";

/**
 * Parse a human-typed height into inches.
 * Accepts 6'3", 6'3, 6-3, 6 ft 3 in, and a bare inch count (75).
 * Returns null rather than guessing when it cannot parse — a wrong height is
 * worse than a missing one.
 */
export function parseHeightInches(raw: string | null): number | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;

  // feet + inches: 6'3"  6'3  6-3  6 ft 3 in
  const fi = s.match(/^(\d{1})\s*(?:'|’|-|ft\.?|feet)\s*(\d{1,2})?\s*(?:"|”|''|in\.?|inches)?$/i);
  if (fi) {
    const feet = Number(fi[1]);
    const inches = fi[2] ? Number(fi[2]) : 0;
    if (inches > 11) return null;
    const total = feet * 12 + inches;
    return total >= 60 && total <= 90 ? total : null;
  }

  // feet only: 6'  6 ft
  const f = s.match(/^(\d{1})\s*(?:'|’|ft\.?|feet)$/i);
  if (f) {
    const total = Number(f[1]) * 12;
    return total >= 60 && total <= 90 ? total : null;
  }

  // bare inches
  const n = s.match(/^(\d{2,3})$/);
  if (n) {
    const total = Number(n[1]);
    return total >= 60 && total <= 90 ? total : null;
  }

  return null;
}

/** Inverse, for rendering a diff back to Coach in the units he typed. */
export function formatHeight(inches: number | null): string | null {
  if (inches == null) return null;
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

/**
 * The sheet's two-value Status maps onto the fuller player lifecycle.
 * Deliberately conservative: an uncommitted recruit becomes a "target" rather
 * than anything more specific, because the sheet cannot express the
 * difference between offered / visit / flip-watch.
 */
export function mapSheetStatus(sheetStatus: Recruit["status"]): PlayerStatus {
  return sheetStatus === "Committed" ? "committed" : "target";
}

/** Match key for pairing a sheet row against an existing player. */
export function matchKey(name: string, position: Position): string {
  return `${name.trim().toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ")}|${position}`;
}

/** Player-shaped fields a sheet row can supply. */
export type ImportableFields = {
  name: string;
  position: Position;
  classYear: number;
  stars: number | null;
  heightIn: number | null;
  weightLb: number | null;
  highSchool: string | null;
  status: PlayerStatus;
  committedTo: string | null;
  onBigBoard: true;
};

export function rowToFields(r: Recruit): ImportableFields {
  return {
    name: r.name,
    position: r.position,
    classYear: r.classYear,
    stars: r.stars,
    heightIn: parseHeightInches(r.height),
    weightLb: r.weight,
    highSchool: r.highSchool,
    status: mapSheetStatus(r.status),
    committedTo: r.committedTeam,
    // Every row pulled from the Big Board sheet is, by definition, on the board.
    onBigBoard: true,
  };
}

// ---------------------------------------------------------------------------
// Diffing
// ---------------------------------------------------------------------------
export type FieldDiff = { field: string; from: string; to: string };

export type ImportRow =
  | { kind: "create"; row: number; key: string; fields: ImportableFields }
  | {
      kind: "update";
      row: number;
      key: string;
      playerId: string;
      name: string;
      diffs: FieldDiff[];
      fields: ImportableFields;
    }
  | { kind: "unchanged"; row: number; key: string; name: string }
  | { kind: "conflict"; row: number; key: string; name: string; reason: string };

export type ImportPreview = {
  sourceUrl: string;
  /**
   * Stable hash of the parsed rows this preview describes. Apply refuses to
   * run against a different one, so a sheet edited between Preview and Apply
   * cannot write changes Coach never saw.
   */
  fingerprint: string;
  rowsRead: number;
  rows: ImportRow[];
  /** Parse/validation failures from the sheet itself. */
  errors: { row: number; name: string | null; issue: string }[];
  /** Video URLs present in the sheet that reference an un-ingested video. */
  unlinkedVideos: { row: number; name: string; youtubeId: string }[];
};

/**
 * Existing player, narrowed to what the diff needs.
 *
 * onBigBoard is widened back to boolean here: ImportableFields pins it to the
 * literal `true` because every row pulled from the Big Board sheet is on the
 * board by definition, but an EXISTING player may well be off it — that is
 * precisely one of the differences the import should surface.
 */
export type ExistingPlayer = {
  id: string;
  name: string;
  position: Position;
  onBigBoard?: boolean;
  /**
   * `null` means "tracked, and currently empty" — a real difference the
   * import should report. Only `undefined` means "not tracked", which the
   * diff skips. Collapsing the two hid every class-year change.
   */
  classYear?: number | null;
} & Partial<Omit<ImportableFields, "name" | "position" | "onBigBoard" | "classYear">>;

function show(v: unknown): string {
  if (v == null || v === "") return "—";
  return String(v);
}

/**
 * Compare sheet rows against existing players and describe what an apply
 * would do. Nothing is written here — Coach sees this first. Silently
 * overwriting admin edits is the same class of bug as a re-sync clobbering
 * written analysis, which the schema already guards against.
 */
export function diffImport(
  sourceUrl: string,
  recruits: Recruit[],
  existing: ExistingPlayer[],
  errors: ImportPreview["errors"] = [],
): ImportPreview {
  const byKey = new Map(existing.map((p) => [matchKey(p.name, p.position), p]));
  const seen = new Map<string, number>();
  const rows: ImportRow[] = [];

  recruits.forEach((r, i) => {
    // +2: header is row 1, and forEach is zero-based.
    const rowNo = i + 2;
    const key = matchKey(r.name, r.position);

    const prior = seen.get(key);
    if (prior !== undefined) {
      rows.push({
        kind: "conflict",
        row: rowNo,
        key,
        name: r.name,
        reason: `duplicate of row ${prior} — same name and position`,
      });
      return;
    }
    seen.set(key, rowNo);

    const fields = rowToFields(r);
    const match = byKey.get(key);

    if (!match) {
      rows.push({ kind: "create", row: rowNo, key, fields });
      return;
    }

    const diffs: FieldDiff[] = [];
    const cmp = <K extends keyof ImportableFields>(
      field: K,
      label: string,
      fmt: (v: unknown) => string = show,
    ) => {
      const to = fields[field];
      const from = match[field as keyof ExistingPlayer];
      if (from === undefined) return; // not tracked on the existing record
      if (fmt(from) !== fmt(to)) {
        diffs.push({ field: label, from: fmt(from), to: fmt(to) });
      }
    };

    cmp("classYear", "class");
    cmp("stars", "stars");
    cmp("heightIn", "height", (v) =>
      show(typeof v === "number" ? formatHeight(v) : v),
    );
    cmp("weightLb", "weight");
    cmp("highSchool", "high school");
    cmp("status", "status");
    cmp("committedTo", "committed to");
    cmp("onBigBoard", "on big board");

    rows.push(
      diffs.length === 0
        ? { kind: "unchanged", row: rowNo, key, name: r.name }
        : {
            kind: "update",
            row: rowNo,
            key,
            playerId: match.id,
            name: r.name,
            diffs,
            fields,
          },
    );
  });

  return {
    sourceUrl,
    fingerprint: fingerprintOf(recruits),
    rowsRead: recruits.length,
    rows,
    errors,
    unlinkedVideos: [],
  };
}

/** Order-sensitive, content-sensitive digest of the parsed sheet. */
export function fingerprintOf(recruits: Recruit[]): string {
  const canonical = JSON.stringify(recruits);
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < canonical.length; i++) {
    const c = canonical.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + c, 0x85ebca6b) >>> 0;
  }
  return `${h1.toString(16)}${h2.toString(16)}-${recruits.length}`;
}

export function summarize(p: ImportPreview) {
  const c = { create: 0, update: 0, unchanged: 0, conflict: 0 };
  for (const r of p.rows) c[r.kind]++;
  return { ...c, errors: p.errors.length, applicable: c.create + c.update };
}
