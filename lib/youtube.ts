import { YOUTUBE_CHANNEL_ID } from "./links";

export type Video = {
  id: string;
  title: string;
  url: string;
  published: string;
  thumbnail: string;
};

const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;

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
