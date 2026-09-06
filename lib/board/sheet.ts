import { z } from "zod";
import { parseCsv } from "./csv";
import { RecruitSchema, type Recruit } from "./types";
import { parseYouTubeId } from "@/lib/youtube";


const TRUTHY = new Set(["true", "yes", "y", "1", "✓", "x"]);

function isTruthy(s: string | undefined): boolean {
  return TRUTHY.has((s ?? "").trim().toLowerCase());
}

function emptyToNull(s: string | undefined): string | null {
  const t = (s ?? "").trim();
  return t.length === 0 ? null : t;
}

function intOrNull(s: string | undefined): number | null {
  const t = emptyToNull(s);
  if (t == null) return null;
  // Strip lbs, commas, etc.
  const cleaned = t.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

export type BoardRowError = {
  /** 1-indexed row number as it appears in the sheet (header is row 1) */
  row: number;
  name: string | null;
  issue: string;
};

export type BoardFetchResult = {
  recruits: Recruit[];
  errors: BoardRowError[];
};

/** Exported for unit testing — parse CSV text into a board result. */
export function parseBoardCsv(csv: string): BoardFetchResult {
  const rows = parseCsv(csv);
  const errors: BoardRowError[] = [];
  if (rows.length === 0) {
    return { recruits: [], errors };
  }

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const colIndex = (name: string) => headers.indexOf(name.toLowerCase());

  const cols = {
    published: colIndex("Published"),
    position: colIndex("Position"),
    name: colIndex("Player Name"),
    classYear: colIndex("Class"),
    stars: colIndex("Star Rating"),
    height: colIndex("Height"),
    weight: colIndex("Weight"),
    highSchool: colIndex("High School"),
    status: colIndex("Status"),
    committedTeam: colIndex("Committed Team"),
    videoUrl: colIndex("Video URL"),
  };

  // Validate required columns are present
  const missing: string[] = [];
  for (const [k, v] of Object.entries(cols)) {
    if (v === -1) missing.push(k);
  }
  if (missing.length > 0) {
    return {
      recruits: [],
      errors: [
        {
          row: 1,
          name: null,
          issue: `header row missing columns: ${missing.join(", ")}`,
        },
      ],
    };
  }

  const recruits: Recruit[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    // Skip wholly-empty rows (trailing blank lines, gaps)
    if (row.every((c) => c.trim() === "")) continue;

    if (!isTruthy(row[cols.published])) continue;

    const rawName = emptyToNull(row[cols.name]);
    const videoRaw = emptyToNull(row[cols.videoUrl]);
    const videoId = videoRaw ? parseYouTubeId(videoRaw) : null;

    const candidate = {
      position: emptyToNull(row[cols.position]),
      name: rawName,
      classYear: intOrNull(row[cols.classYear]),
      stars: intOrNull(row[cols.stars]),
      height: emptyToNull(row[cols.height]),
      weight: intOrNull(row[cols.weight]),
      highSchool: emptyToNull(row[cols.highSchool]),
      status: emptyToNull(row[cols.status]),
      committedTeam: emptyToNull(row[cols.committedTeam]),
      videoId,
    };

    const parsed = RecruitSchema.safeParse(candidate);
    if (!parsed.success) {
      errors.push({
        row: r + 1,
        name: rawName,
        issue: z.prettifyError(parsed.error),
      });
      continue;
    }

    // If the user pasted a non-empty Video URL but we couldn't parse an ID,
    // surface that as a soft warning — the row still renders.
    if (videoRaw && !videoId) {
      errors.push({
        row: r + 1,
        name: rawName,
        issue: `Video URL could not be parsed as a YouTube link: "${videoRaw}"`,
      });
    }

    recruits.push(parsed.data);
  }

  return { recruits, errors };
}
