/**
 * Admin session auth.
 *
 * Single shared password, HMAC-signed cookie. No dependencies — Web Crypto
 * works in both the Node and Edge runtimes, so the same code runs in proxy.ts
 * and in server actions.
 *
 * The Next.js proxy docs are explicit that proxy "should not be used as a full
 * session management or authorization solution", so this is used in two
 * places: proxy.ts does the optimistic redirect, and every admin route calls
 * requireSession() itself. Defence in depth — a routing bug must not expose
 * a mutating route.
 */
const COOKIE_NAME = "ch_admin";
const DEFAULT_TTL_SEC = 60 * 60 * 12; // 12h

export const SESSION_COOKIE = COOKIE_NAME;

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "SESSION_SECRET is not set (min 16 chars). See .env.example.",
    );
  }
  return s;
}

async function key(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Constant-time string compare that does not leak length via early return. */
export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  let diff = ab.length ^ bb.length;
  const len = Math.max(ab.length, bb.length);
  for (let i = 0; i < len; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

export async function createSessionToken(
  ttlSec: number = DEFAULT_TTL_SEC,
): Promise<string> {
  const payload = JSON.stringify({ exp: Date.now() + ttlSec * 1000 });
  const body = b64url(new TextEncoder().encode(payload));
  const sig = await crypto.subtle.sign(
    "HMAC",
    await key(),
    new TextEncoder().encode(body),
  );
  return `${body}.${b64url(new Uint8Array(sig))}`;
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await key(),
      fromB64url(sig),
      new TextEncoder().encode(body),
    );
    if (!ok) return false;
    const { exp } = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

/** True when the supplied password matches ADMIN_PASSWORD. */
export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error("ADMIN_PASSWORD is not set. See .env.example.");
  }
  return safeEqual(input, expected);
}

export const SESSION_TTL_SEC = DEFAULT_TTL_SEC;
