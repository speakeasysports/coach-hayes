import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getConceptPage, getConceptSlugs } from "@/lib/db/public";
import { getThumbnailUrl, getWatchUrl } from "@/lib/youtube";

type Props = { params: Promise<{ concept: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getConceptSlugs()).map((concept) => ({ concept }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { concept } = await params;
  const c = await getConceptPage(concept);
  if (!c) return {};
  const total = c.films.length + c.clips.length;
  const description = `${total} Coach Hayes breakdown${
    total === 1 ? "" : "s"
  } of ${c.label} — ${c.family} — with Georgia film.`;
  return {
    title: `${c.label} — Film Breakdowns`,
    description,
    alternates: { canonical: `/playbook/${c.slug}` },
    openGraph: {
      title: `${c.label} — Film Breakdowns`,
      description,
      images: c.films[0]
        ? [{ url: getThumbnailUrl(c.films[0].youtubeId, "maxres") }]
        : undefined,
    },
  };
}

export default async function ConceptPage({ params }: Props) {
  const { concept } = await params;
  const c = await getConceptPage(concept);
  if (!c) notFound();

  return (
    <article className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <Link
        href="/playbook"
        className="text-sm text-muted transition-colors hover:text-white"
      >
        ← Playbook
      </Link>

      <header className="mt-4 border-b border-border pb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-red">
          {c.family}
        </span>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
          {c.label}
        </h1>
        <p className="mt-3 text-zinc-400">
          {c.films.length} full {c.films.length === 1 ? "breakdown" : "breakdowns"}
          {c.clips.length > 0 && ` · ${c.clips.length} clips`}
        </p>
        {c.explainer && (
          <p className="mt-5 max-w-2xl text-pretty text-zinc-300">{c.explainer}</p>
        )}
      </header>

      {c.films.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight">On film</h2>
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {c.films.map((f) => (
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
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.clips.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">
            Clips
            <span className="ml-2 text-base font-normal text-muted">
              {c.clips.length}
            </span>
          </h2>
          <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {c.clips.map((v) => (
              <li key={v.youtubeId}>
                <a
                  href={getWatchUrl(v.youtubeId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-brand-red"
                >
                  <div className="relative aspect-video bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getThumbnailUrl(v.youtubeId)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
                    />
                  </div>
                  <p className="p-3 text-xs font-medium text-white">{v.title}</p>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.players.length > 0 && (
        <section className="mt-12 border-t border-border pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Players in this film
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {c.players.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/players/${p.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-white transition-colors hover:border-brand-red"
                >
                  {p.name}
                  <span className="text-xs text-muted">{p.position}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
