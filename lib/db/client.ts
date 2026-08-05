import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

export type Db = LibSQLDatabase<typeof schema>;

const DEFAULT_URL = "file:.data/coach-hayes.db";

/**
 * Lazy singleton. `file:` URLs (local dev, scripts) get their directory
 * created on first touch; a DATABASE_URL pointing at hosted libsql/Turso
 * works unchanged with DATABASE_AUTH_TOKEN.
 */
let client: Client | undefined;
let dbInstance: Db | undefined;

export function getDb(): Db {
  if (dbInstance) return dbInstance;
  const url = process.env.DATABASE_URL ?? DEFAULT_URL;
  if (url.startsWith("file:")) {
    mkdirSync(path.dirname(url.slice("file:".length)) || ".", {
      recursive: true,
    });
  }
  client = createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  dbInstance = drizzle(client, { schema });
  return dbInstance;
}

/** For scripts that should exit cleanly without open handles. */
export function closeDb(): void {
  client?.close();
  client = undefined;
  dbInstance = undefined;
}
