import { YOUTUBE_CHANNEL_ID } from "./links";
import type { VideoId } from "./content/types";

export type { VideoId } from "./content/types";

export type Video = {
  id: VideoId;
  title: string;
  url: string;
  published: string;
  thumbnail: string;
};

const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;

export type ThumbnailQuality = "default" | "mq" | "hq" | "sd" | "maxres";

export function getThumbnailUrl(
  videoId: VideoId,
  quality: ThumbnailQuality = "hq",
): string {
  const file = quality === "default" ? "default" : `${quality}default`;
  return `https://i.ytimg.com/vi/${videoId}/${file}.jpg`;
}

export function getWatchUrl(videoId: VideoId): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/**
 * Extract a YouTube video ID from any of the common forms users paste:
 *   - raw 11-char ID                (`dQw4w9WgXcQ`)
 *   - watch URL                     (`https://www.youtube.com/watch?v=…`)
 *   - short URL                     (`https://youtu.be/…`)
 *   - embed / shorts / v URL        (`/embed/…`, `/shorts/…`, `/v/…`)
 *   - youtube-nocookie variants
 *
 * Returns null if no valid 11-char ID is found.
 */
export function parseYouTubeId(input: string): VideoId | null {
  const s = input.trim();
  if (!s) return null;

  if (YT_ID_RE.test(s)) return s;

  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (host === "youtu.be" || host === "www.youtu.be") {
    const id = url.pathname.replace(/^\//, "").split("/")[0];
    return YT_ID_RE.test(id) ? id : null;
  }
  if (
    host.endsWith("youtube.com") ||
    host.endsWith("youtube-nocookie.com")
  ) {
    const v = url.searchParams.get("v");
    if (v && YT_ID_RE.test(v)) return v;
    const m = url.pathname.match(
      /^\/(?:embed|shorts|v|live)\/([A-Za-z0-9_-]{11})/,
    );
    if (m) return m[1];
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function parseEntries(xml: string): Video[] {
  const out: Video[] = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(xml))) {
    const body = m[1];
    const id = /<yt:videoId>([^<]+)<\/yt:videoId>/.exec(body)?.[1];
    const title = /<title>([\s\S]*?)<\/title>/.exec(body)?.[1];
    const url = /<link[^>]+rel="alternate"[^>]+href="([^"]+)"/.exec(body)?.[1];
    const published = /<published>([^<]+)<\/published>/.exec(body)?.[1];
    const thumbnail = /<media:thumbnail\s+url="([^"]+)"/.exec(body)?.[1];
    if (id && title && url && published && thumbnail) {
      out.push({
        id,
        title: decodeEntities(title.trim()),
        url,
        published,
        thumbnail,
      });
    }
  }
  return out;
}

export async function getLatestVideos(limit = 6): Promise<Video[]> {
  try {
    const res = await fetch(FEED_URL, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseEntries(xml).slice(0, limit);
  } catch {
    return [];
  }
}
