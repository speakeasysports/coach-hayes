import { getDb } from "@/lib/db/client";
import { pageContent } from "@/lib/db/schema";
import { resolveCopy, type Copy } from "./copy";

/**
 * Resolved page copy for the public site: stored overrides layered over the
 * defaults in lib/content/copy.ts.
 *
 * One query, and the public pages are all statically generated, so this runs
 * at build time and again when a save revalidates the path — not per request.
 *
 * If the table cannot be read the defaults are returned rather than thrown.
 * Copy is chrome around the real content; a database blip should not take the
 * homepage down when perfectly good text is compiled into the bundle.
 */
export async function getCopy(): Promise<Copy> {
  try {
    const rows = await getDb()
      .select({ key: pageContent.key, value: pageContent.value })
      .from(pageContent);
    return resolveCopy(rows.map((r) => [r.key, r.value]));
  } catch (err) {
    console.error("[copy] falling back to defaults:", err);
    return resolveCopy([]);
  }
}
