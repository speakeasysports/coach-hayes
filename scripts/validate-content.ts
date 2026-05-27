import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { PlaySchema } from "../lib/content/types";

type Collection<T> = {
  label: string;
  dir: string;
  schema: z.ZodType<T>;
};

const ROOT = path.resolve(process.cwd(), "content");

// Recruits now live in a Google Sheet (see README → "Big Board"); only plays
// remain file-backed.
const COLLECTIONS: Collection<unknown>[] = [
  { label: "plays", dir: path.join(ROOT, "plays"), schema: PlaySchema },
];

type Result =
  | { kind: "ok"; file: string }
  | { kind: "error"; file: string; message: string };

async function validateCollection<T>(c: Collection<T>): Promise<Result[]> {
  let entries: string[];
  try {
    entries = await readdir(c.dir);
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

  const files = entries.filter((f) => f.endsWith(".json")).sort();
  const results: Result[] = [];

  for (const file of files) {
    const full = path.join(c.dir, file);
    const rel = path.relative(process.cwd(), full);
    const raw = await readFile(full, "utf8");

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      results.push({
        kind: "error",
        file: rel,
        message: `Invalid JSON: ${
          err instanceof Error ? err.message : String(err)
        }`,
      });
      continue;
    }

    const res = c.schema.safeParse(parsed);
    if (!res.success) {
      results.push({
        kind: "error",
        file: rel,
        message: z.prettifyError(res.error),
      });
      continue;
    }
    results.push({ kind: "ok", file: rel });
  }

  return results;
}

async function main(): Promise<void> {
  let total = 0;
  let failed = 0;

  for (const c of COLLECTIONS) {
    const results = await validateCollection(c);
    process.stdout.write(`\n${c.label} (${results.length})\n`);
    if (results.length === 0) {
      process.stdout.write("  (no files)\n");
      continue;
    }
    for (const r of results) {
      total++;
      if (r.kind === "ok") {
        process.stdout.write(`  ok  ${r.file}\n`);
      } else {
        failed++;
        process.stdout.write(`  FAIL ${r.file}\n`);
        for (const line of r.message.split("\n")) {
          process.stdout.write(`      ${line}\n`);
        }
      }
    }
  }

  process.stdout.write(
    `\n${total - failed}/${total} passed${failed ? `, ${failed} failed` : ""}\n`,
  );
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
