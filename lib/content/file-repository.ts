import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { ContentRepository } from "./repository";
import { PlaySchema, RecruitSchema, type Play, type Recruit } from "./types";

async function loadCollection<T>(
  dir: string,
  schema: z.ZodType<T>,
): Promise<T[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "ENOENT"
    ) {
      return [];
    }
    throw err;
  }

  const files = entries.filter((f) => f.endsWith(".json"));
  const rows: T[] = [];

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const raw = await readFile(fullPath, "utf8");

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new Error(
        `Invalid JSON in ${path.relative(process.cwd(), fullPath)}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    const result = schema.safeParse(parsed);
    if (!result.success) {
      throw new Error(
        `Content validation failed for ${path.relative(
          process.cwd(),
          fullPath,
        )}:\n${z.prettifyError(result.error)}`,
      );
    }
    rows.push(result.data);
  }

  return rows;
}

function sortRecruits(rows: Recruit[]): Recruit[] {
  return [...rows].sort(
    (a, b) => b.classYear - a.classYear || a.name.localeCompare(b.name),
  );
}

function sortPlays(rows: Play[]): Play[] {
  return [...rows].sort(
    (a, b) =>
      (b.season ?? -Infinity) - (a.season ?? -Infinity) ||
      a.name.localeCompare(b.name),
  );
}

export function createFileRepository(rootDir: string): ContentRepository {
  let recruitsCache: Promise<Recruit[]> | null = null;
  let playsCache: Promise<Play[]> | null = null;

  function recruits(): Promise<Recruit[]> {
    if (!recruitsCache) {
      recruitsCache = loadCollection(
        path.join(rootDir, "recruits"),
        RecruitSchema,
      ).then(sortRecruits);
    }
    return recruitsCache;
  }

  function plays(): Promise<Play[]> {
    if (!playsCache) {
      playsCache = loadCollection(
        path.join(rootDir, "plays"),
        PlaySchema,
      ).then(sortPlays);
    }
    return playsCache;
  }

  return {
    getRecruits: recruits,
    async getRecruitById(id) {
      return (await recruits()).find((r) => r.id === id);
    },
    getPlays: plays,
    async getPlayById(id) {
      return (await plays()).find((p) => p.id === id);
    },
  };
}
