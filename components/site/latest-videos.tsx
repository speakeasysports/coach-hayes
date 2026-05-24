import { getLatestVideos } from "@/lib/youtube";
import { YOUTUBE_CHANNEL_URL } from "@/lib/links";

export async function LatestVideos() {
  const videos = await getLatestVideos(6);
  if (videos.length === 0) return null;

  return (
    <section className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-red">
              Latest
            </span>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              From the channel
            </h2>
          </div>
          <a
            href={YOUTUBE_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-sm font-semibold text-zinc-300 transition-colors hover:text-white sm:inline"
          >
            View all on YouTube →
          </a>
        </div>

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => (
            <li key={v.id}>
              <a
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-brand-red"
              >
                <div className="relative aspect-video overflow-hidden bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.thumbnail}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3 className="line-clamp-2 text-base font-semibold leading-snug">
                    {v.title}
                  </h3>
                  <time
                    dateTime={v.published}
                    className="mt-auto text-xs text-zinc-400"
                  >
                    {new Date(v.published).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </div>
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-6 sm:hidden">
          <a
            href={YOUTUBE_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-zinc-300 hover:text-white"
          >
            View all on YouTube →
          </a>
        </div>
      </div>
    </section>
  );
}

export function LatestVideosSkeleton() {
  return (
    <section className="border-t border-border" aria-hidden>
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8 space-y-2">
          <div className="h-3 w-16 animate-pulse rounded bg-surface-2" />
          <div className="h-7 w-56 animate-pulse rounded bg-surface-2" />
        </div>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className="overflow-hidden rounded-xl border border-border bg-surface"
            >
              <div className="aspect-video animate-pulse bg-surface-2" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 animate-pulse rounded bg-surface-2" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-surface-2" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
