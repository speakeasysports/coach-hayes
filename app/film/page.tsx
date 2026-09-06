import type { Metadata } from "next";
import Link from "next/link";
import { getFilmIndex } from "@/lib/db/public";
import { getThumbnailUrl } from "@/lib/youtube";

export const metadata: Metadata = {
  title: "Film",
  description:
    "Every Coach Hayes film breakdown — Georgia players, schemes and situations, newest first.",
  alternates: { canonical: "/film" },
};

export default async function FilmIndexPage() {
  const films = await getFilmIndex();

  if (films.length === 0) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-5 px-4 py-24 text-center sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight">Film</h1>
        <p className="text-zinc-400">Breakdowns are being indexed. Check back soon.</p>
      </section>
    );
  }

  // Grouped by series — that's the structure Coach already publishes in, so
  // it's the one a returning viewer is looking for.
  const bySeries = new Map<string, typeof films>();
  for (const f of films) {
    const key = f.seriesName ?? "Other breakdowns";
    const arr = bySeries.get(key) ?? [];
    arr.push(f);
    bySeries.set(key, arr);
  }
  const groups = [...bySeries.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-red">
          Film room
        </span>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Film</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Every full breakdown, grouped by series.{" "}
          <span className="text-zinc-500">{films.length} breakdowns</span>
        </p>
      </header>

      <div className="flex flex-col gap-12">
        {groups.map(([name, rows]) => (
          <section key={name}>
            <h2 className="mb-4 flex items-baseline gap-2 text-2xl font-semibold tracking-tight">
              <span>{name}</span>
              <span className="text-base font-normal text-muted">{rows.length}</span>
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((f) => (
                <li key={f.slug}>
                  <Link
                    href={`/film/${f.slug}`}
                    className="group block overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-brand-red"
                  >
                    <div className="relative aspect-video bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getThumbnailUrl(f.youtubeId)}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-white">{f.title}</p>
                      <p className="mt-1 text-xs text-muted">
                        {f.publishedAt.slice(0, 10)}
                        {f.views > 0 && ` · ${f.views.toLocaleString()} views`}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
