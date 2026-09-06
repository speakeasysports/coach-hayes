/**
 * Patreon post links.
 *
 * Scope note, because it shapes everything downstream: Patreon's paid video
 * cannot be embedded off-site. There is no oEmbed endpoint, the post page
 * refuses server-side fetches behind a Cloudflare challenge, and the API v2
 * Post resource carries no thumbnail — `embed_url` populates only when the
 * post embeds someone ELSE's media. So a Patreon link on this site is always
 * a link, and the playable preview is a YouTube upload sitting next to it.
 */

/**
 * A specific post, not the campaign page. Both shapes Patreon mints:
 *   patreon.com/posts/<slug-or-id>
 *   patreon.com/<creator>/posts/<slug-or-id>
 *
 * Requiring /posts/ is what keeps the channel's description boilerplate — which
 * carries a bare patreon.com/CoachHayesHudl link on ~200 videos — from being
 * mistaken for a per-video link. That boilerplate once inflated a tag from 71
 * matches to 222; the same trap applies here.
 */
const POST_PATH = /^\/(?:[A-Za-z0-9_-]+\/)?posts\/[A-Za-z0-9_-]+\/?$/;

/** Query params worth keeping. `collection` scopes the post to a series view. */
const KEEP_PARAMS = new Set(["collection"]);

function parse(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "patreon.com") return null;
  return url;
}

export function isPatreonPostUrl(raw: string): boolean {
  const url = parse(raw);
  return url != null && POST_PATH.test(url.pathname);
}

/**
 * Canonical form: https, www, no tracking params. Returns null when the input
 * is not a Patreon post URL, so callers can validate and normalize in one step.
 */
export function normalizePatreonUrl(raw: string): string | null {
  const url = parse(raw);
  if (!url || !POST_PATH.test(url.pathname)) return null;

  const params = new URLSearchParams();
  for (const [k, v] of url.searchParams) {
    if (KEEP_PARAMS.has(k)) params.set(k, v);
  }
  const query = params.toString();
  const path = url.pathname.replace(/\/$/, "");
  return `https://www.patreon.com${path}${query ? `?${query}` : ""}`;
}

/**
 * First Patreon post link in a block of text, normalized. Feed this the
 * BOILERPLATE-STRIPPED description: a link that appears on every video is a
 * channel link, not this video's companion post.
 */
export function extractPatreonPostUrl(text: string): string | null {
  const candidates = text.match(/https?:\/\/[^\s<>"')\]]+/gi);
  if (!candidates) return null;
  for (const c of candidates) {
    // Trailing punctuation is part of the sentence, not the URL.
    const cleaned = c.replace(/[.,;:!?]+$/, "");
    const normalized = normalizePatreonUrl(cleaned);
    if (normalized) return normalized;
  }
  return null;
}
