import type { Metadata } from "next";
import Link from "next/link";
import { repo } from "@/lib/admin/repo";
import type { VideoListFilter } from "@/lib/admin/contract";
import { VideoRows } from "./video-rows";

export const metadata: Metadata = { title: "Videos" };

const PAGE = 50;

type Search = {
  q?: string;
  show?: string;
  page?: string;
};

/**
 * Every video, not just the ones awaiting review.
 *
 * The queue only holds videos that are unpublished AND unreviewed, and the
 * Edit button there was the only route to /admin/video/[id] — so confirming a
 * video removed the only way back to it. This page is that way back.
 */
export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const show = sp.show ?? "all";
  const page = Math.max(0, Number(sp.page) || 0);

  const filter: VideoListFilter = { query: q };
  if (show === "live") filter.published = true;
  if (show === "not-live") filter.published = false;
  if (show === "patreon") filter.patreonOnly = true;

  const [items, total] = await Promise.all([
    repo.listVideos(filter, { limit: PAGE, offset: page * PAGE }),
    repo.countVideos(filter),
  ]);

  const qs = (over: Partial<Search>) => {
    const p = new URLSearchParams();
    const next = { q, show, page: String(page), ...over };
    if (next.q) p.set("q", next.q);
    if (next.show && next.show !== "all") p.set("show", next.show);
    if (next.page && next.page !== "0") p.set("page", next.page);
    const s = p.toString();
    return s ? `/admin/videos?${s}` : "/admin/videos";
  };

  const from = total === 0 ? 0 : page * PAGE + 1;
  const to = Math.min(total, (page + 1) * PAGE);

  return (
    <section>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Videos
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Everything the site knows about, whether it&rsquo;s live or not. Open
          one to change its headline, write an analysis, or point it at a
          Patreon post — including videos you confirmed a long time ago.
        </p>
      </header>

      <form action="/admin/videos" className="mt-6 flex flex-wrap gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search titles…"
          className="min-h-[44px] flex-1 rounded-md border border-border bg-surface-2 px-3 py-2 text-white outline-none placeholder:text-zinc-500 focus:border-brand-red"
        />
        {show !== "all" && <input type="hidden" name="show" value={show} />}
        <button
          type="submit"
          className="min-h-[44px] rounded-md border border-border bg-surface px-4 text-sm font-semibold text-white transition-colors hover:border-brand-red"
        >
          Search
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["live", "On the site"],
            ["not-live", "Not live"],
            ["patreon", "Patreon previews"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={qs({ show: key, page: "0" })}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              show === key
                ? "border-brand-red bg-brand-red/10 font-semibold text-white"
                : "border-border bg-surface text-zinc-300 hover:border-brand-red hover:text-white"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <p className="mt-4 text-sm text-muted">
        {total === 0
          ? "Nothing matches."
          : `${from}–${to} of ${total}${q ? ` matching “${q}”` : ""}`}
      </p>

      <VideoRows items={items} />

      {total > PAGE && (
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-4">
          {page > 0 ? (
            <Link
              href={qs({ page: String(page - 1) })}
              className="text-sm text-zinc-300 transition-colors hover:text-white"
            >
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          {to < total ? (
            <Link
              href={qs({ page: String(page + 1) })}
              className="text-sm text-zinc-300 transition-colors hover:text-white"
            >
              Older →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </section>
  );
}
