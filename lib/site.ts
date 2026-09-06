/**
 * Canonical origin for the public site.
 *
 * Single source of truth for both `metadataBase` (which stamps canonical and
 * OG URLs onto every page) and the proxy's indexability guard, so the two can
 * never disagree about what "the real site" is.
 *
 * Override with SITE_URL if the canonical domain ever changes.
 */
export const SITE_URL = process.env.SITE_URL ?? "https://coachhayeshudl.com";

export const CANONICAL_HOST = new URL(SITE_URL).host;

/**
 * True for any host that isn't the canonical one — vercel.app deployment
 * URLs, per-commit preview URLs, staging domains.
 *
 * Those hosts serve identical content with canonical tags pointing at the
 * real domain, so letting a crawler index them creates duplicate content
 * whose canonical target currently serves a completely different site.
 */
export function isCanonicalHost(host: string | null | undefined): boolean {
  if (!host) return false;
  // Strip any port (local dev).
  return host.split(":")[0] === CANONICAL_HOST.split(":")[0];
}
