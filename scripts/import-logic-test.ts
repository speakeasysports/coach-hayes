/**
 * Unit checks for the sheet->database import mapping.
 *   npx tsx scripts/import-logic-test.ts
 */
import {
  fingerprintOf,
  parseHeightInches,
  formatHeight,
  mapSheetStatus,
  matchKey,
  diffImport,
  summarize,
  type ExistingPlayer,
} from "../lib/board/import";
import { parseBoardCsv } from "../lib/board/sheet";

let failed = 0;
function eq(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failed++;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${ok ? "" : `  got ${a} want ${e}`}`);
}

console.log("parseHeightInches");
eq(`6'3"`, parseHeightInches(`6'3"`), 75);
eq(`6'3`, parseHeightInches(`6'3`), 75);
eq(`5'11"`, parseHeightInches(`5'11"`), 71);
eq(`6-3`, parseHeightInches(`6-3`), 75);
eq(`6 ft 3 in`, parseHeightInches(`6 ft 3 in`), 75);
eq(`6'`, parseHeightInches(`6'`), 72);
eq(`75 (bare inches)`, parseHeightInches(`75`), 75);
eq(`smart quote 6’3"`, parseHeightInches(`6’3"`), 75);
eq(`null`, parseHeightInches(null), null);
eq(`empty`, parseHeightInches("  "), null);
eq(`garbage -> null`, parseHeightInches("tall"), null);
eq(`impossible inches -> null`, parseHeightInches(`6'15"`), null);
eq(`out of range low -> null`, parseHeightInches(`40`), null);
eq(`out of range high -> null`, parseHeightInches(`9'0"`), null);

console.log("formatHeight");
eq("75 -> 6'3\"", formatHeight(75), `6'3"`);
eq("71 -> 5'11\"", formatHeight(71), `5'11"`);
eq("null", formatHeight(null), null);

console.log("mapSheetStatus");
eq("Committed", mapSheetStatus("Committed"), "committed");
eq("Uncommitted", mapSheetStatus("Uncommitted"), "target");

console.log("matchKey");
eq("normalises case/punctuation", matchKey("C.J.  Smith", "WR"), matchKey("cj smith", "WR"));
eq("position is part of key", matchKey("Sam Jones", "WR") === matchKey("Sam Jones", "DB"), false);

console.log("diffImport");
const csv = `Published,Position,Player Name,Class,Star Rating,Height,Weight,High School,Status,Committed Team,Video URL
TRUE,QB,Alpha Passer,2027,4,"6'3""",195,North HS,Uncommitted,,
TRUE,RB,Bravo Back,2027,4,"5'11""",205,South HS,Committed,Georgia,
TRUE,WR,Charlie Catch,2028,3,"6'1""",180,East HS,Uncommitted,,
TRUE,QB,Alpha Passer,2027,4,"6'3""",195,North HS,Uncommitted,,
`;
const parsed = parseBoardCsv(csv);
eq("csv rows parsed", parsed.recruits.length, 4);

const existing: ExistingPlayer[] = [
  // unchanged
  { id: "p1", name: "Bravo Back", position: "RB", classYear: 2027, stars: 4,
    heightIn: 71, weightLb: 205, highSchool: "South HS", status: "committed",
    committedTo: "Georgia", onBigBoard: true },
  // changed: stars + status
  { id: "p2", name: "Alpha Passer", position: "QB", classYear: 2027, stars: 3,
    heightIn: 75, weightLb: 195, highSchool: "North HS", status: "target",
    committedTo: null, onBigBoard: false },
];

const preview = diffImport("https://example/pub?output=csv", parsed.recruits, existing, parsed.errors);
const s = summarize(preview);
eq("summary", s, { create: 1, update: 1, unchanged: 1, conflict: 1, errors: 0, applicable: 2 });

const upd = preview.rows.find((r) => r.kind === "update");
eq("update targets p2", upd && "playerId" in upd ? upd.playerId : null, "p2");
eq(
  "diff fields",
  upd && "diffs" in upd ? upd.diffs.map((d) => d.field).sort() : null,
  ["on big board", "stars"],
);
const dup = preview.rows.find((r) => r.kind === "conflict");
eq("duplicate row flagged", dup?.kind, "conflict");
eq("conflict cites the earlier row", dup && "reason" in dup ? /row 2/.test(dup.reason) : false, true);

const created = preview.rows.find((r) => r.kind === "create");
eq("create carries onBigBoard", created && "fields" in created ? created.fields.onBigBoard : null, true);
eq("create maps height to inches", created && "fields" in created ? created.fields.heightIn : null, 73);

// --- regressions from the code review -------------------------------------
console.log("classYear: null is 'tracked and empty', not 'untracked'");
{
  const csv2 = `Published,Position,Player Name,Class,Star Rating,Height,Weight,High School,Status,Committed Team,Video URL
TRUE,QB,Delta Arm,2027,4,"6'2""",200,West HS,Uncommitted,,
`;
  const rows = parseBoardCsv(csv2).recruits;
  // NULL class year on the existing record must produce a diff, not be skipped.
  const withNull = diffImport("u", rows, [
    { id: "p9", name: "Delta Arm", position: "QB", classYear: null, stars: 4,
      heightIn: 74, weightLb: 200, highSchool: "West HS", status: "target",
      committedTo: null, onBigBoard: true },
  ]);
  const r1 = withNull.rows[0];
  eq("null classYear yields an update", r1.kind, "update");
  eq(
    "and the diff names class",
    r1 && "diffs" in r1 ? r1.diffs.map((d) => d.field) : null,
    ["class"],
  );
  // undefined still means "not tracked" and is skipped.
  const withUndef = diffImport("u", rows, [
    { id: "p9", name: "Delta Arm", position: "QB", stars: 4,
      heightIn: 74, weightLb: 200, highSchool: "West HS", status: "target",
      committedTo: null, onBigBoard: true },
  ]);
  eq("undefined classYear stays untracked", withUndef.rows[0].kind, "unchanged");
}

console.log("fingerprint");
{
  const a = parseBoardCsv(`Published,Position,Player Name,Class,Star Rating,Height,Weight,High School,Status,Committed Team,Video URL
TRUE,QB,Echo One,2027,4,"6'2""",200,A HS,Uncommitted,,
`).recruits;
  const b = parseBoardCsv(`Published,Position,Player Name,Class,Star Rating,Height,Weight,High School,Status,Committed Team,Video URL
TRUE,QB,Echo One,2027,5,"6'2""",200,A HS,Uncommitted,,
`).recruits;
  eq("stable for identical content", fingerprintOf(a), fingerprintOf(a));
  eq("changes when a value changes", fingerprintOf(a) === fingerprintOf(b), false);
  eq("encodes row count", fingerprintOf(a).endsWith("-1"), true);
}

console.log(failed === 0 ? "\n✓ all import logic checks passed" : `\n✗ ${failed} failed`);
if (failed) process.exit(1);
