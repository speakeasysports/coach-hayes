/**
 * Minimal RFC-4180 CSV parser. Handles:
 *   - quoted fields with embedded commas, newlines, and "" escapes
 *   - LF, CRLF, and CR line endings
 *   - leading UTF-8 BOM
 *   - trailing newline (no phantom empty row)
 *
 * Does NOT handle: streaming, type coercion, header mapping. Returns a
 * rectangular-ish array of string arrays; column count is whatever each row
 * actually has.
 */
export function parseCsv(input: string): string[][] {
  // Strip UTF-8 BOM
  if (input.charCodeAt(0) === 0xfeff) input = input.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;
  const len = input.length;

  while (i < len) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      i++;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      // Consume CRLF as one line break
      if (ch === "\r" && input[i + 1] === "\n") i++;
      i++;
      continue;
    }
    cell += ch;
    i++;
  }

  // Flush trailing cell/row (no terminating newline)
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}
