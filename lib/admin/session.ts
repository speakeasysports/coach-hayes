import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./auth";

/**
 * Per-route auth check. Called by every admin page and server action.
 * proxy.ts already redirects unauthenticated traffic, but that is an
 * optimistic check — this is the one that actually guards data access.
 */
export async function requireSession(): Promise<void> {
  const jar = await cookies();
  const ok = await verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!ok) redirect("/admin/login");
}

export async function hasSession(): Promise<boolean> {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}
