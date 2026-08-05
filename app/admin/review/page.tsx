import type { Metadata } from "next";
import Link from "next/link";
import { getReviewQueue, getReviewQueueCount } from "@/lib/db/queries";
import { getThumbnailUrl, getWatchUrl } from "@/lib/youtube";
import { approveVideo, dropPlayerLink, holdVideo } from "./actions";

export const metadata: Metadata = {
  title: "Review queue",
  robots: { index: false, follow: false },
};

// Always render fresh from the database — this page IS the working state.
export const dynamic = "force-dynamic";

const PER_PAGE = 25;

function fmtDuration(sec: number): string {
  if (sec <= 0) return "live?";
  const m = Math.floor(sec / 60);
  return m >= 1 ? `${m}m${sec % 60 ? ` ${sec % 60}s` : ""}` : `${sec}s`;
}

function confidenceClass(score: number): string {
  if (score >= 78) return "text-amber-400 border-amber-400/40";
  if (score >= 65) return "text-orange-400 border-orange-400/40";
  return "text-brand-red border-brand-red/40";
}

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const total = await getReviewQueueCount();
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number(params.page) || 1));
  const items = await getReviewQueue(page, PER_PAGE);

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-red">
          Admin
        </span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Review queue
        </h1>
        <p className="mt-3 text-zinc-400">
          <strong className="text-white">{total}</strong> auto-tagged{" "}
          {total === 1 ? "video" : "videos"} below the auto-publish bar.
          Approve publishes with the tags shown; hold keeps it off the site.
          Either way it leaves the queue and the pipeline never re-tags it.
          Highest confidence first — those are the quick wins.
        </p>
      </header>

      {items.length === 0 && (
        <p className="rounded-lg border border-border bg-surface p-6 text-zinc-300">
          Queue is empty. Nice work, Coach.
        </p>
      )}

      <ul className="flex flex-col gap-4">
        {items.map((v) => (
          <li
            key={v.id}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <div className="flex gap-4">
              <a
                href={getWatchUrl(v.youtubeId)}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getThumbnailUrl(v.youtubeId, "mq")}
                  alt=""
                  className="h-20 w-36 rounded object-cover"
                />
              </a>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <a
                    href={getWatchUrl(v.youtubeId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-white hover:text-brand-red"
                  >
                    {v.title}
                  </a>
                  <span
                    className={`shrink-0 rounded border px-2 py-0.5 font-mono text-xs ${confidenceClass(v.tagConfidence)}`}
                    title="tag confidence (auto-publish needs 80)"
                  >
                    {v.tagConfidence}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {new Date(v.publishedAt).toLocaleDateString()} ·{" "}
                  {fmtDuration(v.durationSec)} ·{" "}
                  {v.views.toLocaleString()} views
                  {v.seriesName && <> · {v.seriesName}</>}
                </p>

                {(v.players.length > 0 ||
                  v.concepts.length > 0 ||
                  v.topics.length > 0 ||
                  v.positionGroups.length > 0) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {v.players.map((p) => (
                      <span
                        key={p.playerId}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 py-1 pl-3 pr-1 text-xs text-zinc-200"
                      >
                        {p.name}
                        <span className="font-mono text-muted">
                          {p.source === "manual" ? "manual" : p.score}
                        </span>
                        {p.source === "auto" && (
                          <form action={dropPlayerLink} className="inline-flex">
                            <input type="hidden" name="videoId" value={v.id} />
                            <input
                              type="hidden"
                              name="playerId"
                              value={p.playerId}
                            />
                            <button
                              type="submit"
                              title={`Not ${p.name} — drop this link`}
                              className="rounded-full px-1.5 text-muted transition-colors hover:bg-brand-red/20 hover:text-white"
                            >
                              ✕
                            </button>
                          </form>
                        )}
                      </span>
                    ))}
                    {[...v.concepts, ...v.topics, ...v.positionGroups].map(
                      (t) => (
                        <span
                          key={t}
                          className="rounded-full border border-border px-3 py-1 text-xs text-muted"
                        >
                          {t}
                        </span>
                      ),
                    )}
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <form action={approveVideo}>
                    <input type="hidden" name="videoId" value={v.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-brand-red bg-brand-red/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-red/20"
                    >
                      Approve &amp; publish
                    </button>
                  </form>
                  <form action={holdVideo}>
                    <input type="hidden" name="videoId" value={v.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:border-zinc-500"
                    >
                      Hold (keep off site)
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {pages > 1 && (
        <nav className="mt-8 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={`/admin/review?page=${page - 1}`}
              className="text-zinc-300 hover:text-brand-red"
            >
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">
            page {page} / {pages}
          </span>
          {page < pages ? (
            <Link
              href={`/admin/review?page=${page + 1}`}
              className="text-zinc-300 hover:text-brand-red"
            >
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </section>
  );
}
