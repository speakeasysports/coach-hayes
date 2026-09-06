import Link from "next/link";
import type { VideoListItem } from "@/lib/admin/contract";
import { getThumbnailUrl } from "@/lib/youtube";

function readable(sec: number): string {
  if (sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Shared by /admin/videos and the player page's film list. */
export function VideoRows({ items }: { items: VideoListItem[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-4 flex flex-col gap-2">
      {items.map((v) => (
        <li key={v.id}>
          <Link
            href={`/admin/video/${v.id}`}
            className="flex items-center gap-4 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-brand-red"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getThumbnailUrl(v.youtubeId)}
              alt=""
              loading="lazy"
              className="h-12 w-20 shrink-0 rounded object-cover"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white">
                {v.title}
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted">
                {v.publishedAt.slice(0, 10)} · {readable(v.durationSec)} ·{" "}
                {v.format === "short" ? "clip" : "breakdown"}
                {v.playerNames.length > 0 && ` · ${v.playerNames.join(", ")}`}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              {v.hasPatreonUrl && <Tag tone="red">Preview</Tag>}
              {v.published ? (
                <Tag>Live</Tag>
              ) : (
                <Tag tone="dim">
                  {v.reviewedAt ? "Archived" : "In queue"}
                </Tag>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Tag({
  tone = "plain",
  children,
}: {
  tone?: "plain" | "red" | "dim";
  children: React.ReactNode;
}) {
  const cls =
    tone === "red"
      ? "border-brand-red bg-brand-red/10 text-white"
      : tone === "dim"
        ? "border-border text-muted"
        : "border-border text-zinc-300";
  return (
    <span
      className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs ${cls}`}
    >
      {children}
    </span>
  );
}
