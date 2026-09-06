import Link from "next/link";
import { getLatestFilm } from "@/lib/db/public";
import { getThumbnailUrl } from "@/lib/youtube";

/**
 * The homepage's main content module. This used to render the channel's
 * YouTube RSS feed, so the most prominent block on the site pushed every
 * visitor straight back out to YouTube. It now shows the newest breakdowns
 * that have a page here; the "everything on YouTube" link stays, one line
 * down, for people who want the raw feed.
 */
export async function LatestVideos() {
  const films = await getLatestFilm(6);
  if (films.length === 0) return null;

  return (
    <section className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-red">
              Latest
            </span>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              New breakdowns
            </h2>
          </div>
          <Link
            href="/film"
            className="hidden text-sm font-semibold text-zinc-300 transition-colors hover:text-white sm:inline"
          >
            All film →
          </Link>
        </div>

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {films.map((f) => (
            <li key={f.slug}>
              <Link
                href={`/film/${f.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-brand-red"
              >
                <div className="relative aspect-video overflow-hidden bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getThumbnailUrl(f.youtubeId)}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3 className="line-clamp-2 text-base font-semibold leading-snug">
                    {f.title}
                  </h3>
                  <p className="mt-auto text-xs text-zinc-400">
                    <time dateTime={f.publishedAt}>
                      {new Date(f.publishedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                    {f.seriesName && ` · ${f.seriesName}`}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-6 sm:hidden">
          <Link
            href="/film"
            className="text-sm font-semibold text-zinc-300 hover:text-white"
          >
            All film →
          </Link>
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
