/**
 * Admin session: an HMAC-derived static token in an httpOnly cookie.
 *
 * The review queue introduced real write actions (publish/unpublish), which
 * crosses the line drawn in the README's admin-access notes: obscurity was
 * acceptable for a cache-refresh button, not for mutations. This is the
 * signed-cookie gate scoped there — deliberately minimal for a single admin:
 * no sessions table, no expiry (the token is stable until ADMIN_PASSWORD
 * changes, which invalidates every cookie at once).
 *
 * Web Crypto only, so the same code runs in proxy.ts (edge) and in server
 * actions (node). Layering follows the Next.js auth guidance: proxy does the
 * optimistic redirect; every server action re-checks for real.
 */
export const ADMIN_COOKIE = "ch_admin";
const TOKEN_CONTEXT = "coach-hayes-admin-v1";

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Stable session token derived from the admin password. */
export async function sessionToken(password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(TOKEN_CONTEXT)),
  );
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** True when the cookie value is the current password's session token. */
export async function isValidSession(
  cookieValue: string | undefined,
): Promise<boolean> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || !cookieValue) return false;
  return timingSafeEqual(cookieValue, await sessionToken(password));
}

/** Constant-time password check for the login action. */
export async function isCorrectPassword(attempt: string): Promise<boolean> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  // Compare HMAC outputs rather than raw strings so length isn't leaked.
  return timingSafeEqual(await sessionToken(attempt), await sessionToken(password));
}
