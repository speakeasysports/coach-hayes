import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

export type Db = NeonDatabase<typeof schema>;

/**
 * Neon over WebSockets, NOT neon-http.
 *
 * The http driver cannot do transactions — it throws "No transactions support
 * in neon-http driver" — and lib/admin/db-repo.ts wraps tag replacement in
 * db.transaction() specifically because a partial failure there destroys a
 * video's tags. Picking the obvious http driver would silently drop that
 * safety property at runtime.
 *
 * Node has had a global WebSocket since 22, but the driver still expects one
 * to be configured explicitly under Node, so `ws` is supplied when no global
 * exists (serverless/edge runtimes provide their own).
 */
if (!globalThis.WebSocket) {
  neonConfig.webSocketConstructor = ws;
}

let pool: Pool | undefined;
let dbInstance: Db | undefined;

export function getDb(): Db {
  if (dbInstance) return dbInstance;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Point it at a Postgres connection string " +
        "(Neon: use the POOLED connection string). See .env.example.",
    );
  }

  pool = new Pool({ connectionString: url });
  dbInstance = drizzle(pool, { schema });
  return dbInstance;
}

/** For scripts that should exit cleanly without open handles. */
export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = undefined;
  dbInstance = undefined;
}
