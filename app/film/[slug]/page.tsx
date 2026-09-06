import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFilmPage, getFilmSlugs } from "@/lib/db/public";
import { getThumbnailUrl, getWatchUrl } from "@/lib/youtube";
import { SITE_URL } from "@/lib/site";
import { VideoEmbed } from "./video-embed";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getFilmSlugs()).map((slug) => ({ slug }));
}

function isoDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `PT${m}M${s}S`;
}

function readableDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const film = await getFilmPage(slug);
  if (!film) return {};

  const who = film.players.map((p) => p.name).join(", ");
  const what = film.concepts.map((c) => c.label).join(", ");
  const description =
    [who && `Film breakdown of ${who}`, what && `covering ${what}`]
      .filter(Boolean)
      .join(", ") || `Coach Hayes film breakdown — ${film.title}`;

  return {
    title: film.title,
    description: `${description}.`,
    alternates: { canonical: `/film/${film.slug}` },
    openGraph: {
      title: film.title,
      description: `${description}.`,
      type: "video.other",
      images: [{ url: getThumbnailUrl(film.youtubeId, "maxres") }],
    },
  };
}

export default async function FilmPage({ params }: Props) {
  const { slug } = await params;
  const film = await getFilmPage(slug);
  if (!film) notFound();

  // VideoObject markup — this is what earns a video thumbnail in search
  // results rather than a plain blue link.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: film.title,
    description: film.description.slice(0, 300) || film.title,
    thumbnailUrl: getThumbnailUrl(film.youtubeId, "maxres"),
    uploadDate: film.publishedAt,
    duration: isoDuration(film.durationSec),
    embedUrl: `https://www.youtube-nocookie.com/embed/${film.youtubeId}`,
    url: `${SITE_URL}/film/${film.slug}`,
  };

  return (
    <article className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link
        href="/film"
        className="text-sm text-muted transition-colors hover:text-white"
      >
        ← All film
      </Link>

      <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
        {film.title}
      </h1>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-muted">
        <span>{film.publishedAt.slice(0, 10)}</span>
        <span aria-hidden>·</span>
        <span>{readableDuration(film.durationSec)}</span>
        {film.views > 0 && (
          <>
            <span aria-hidden>·</span>
            <span>{film.views.toLocaleString()} views</span>
          </>
        )}
        {film.seriesName && (
          <>
            <span aria-hidden>·</span>
            <span>{film.seriesName}</span>
          </>
        )}
      </p>

      <div className="mt-6">
        <VideoEmbed youtubeId={film.youtubeId} title={film.title} />
      </div>

      {film.players.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Players in this film
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {film.players.map((p) => (
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

      {(film.concepts.length > 0 || film.topics.length > 0) && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            What it covers
          </h2>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {film.concepts.map((c) => (
              <li
                key={c.slug}
                className="rounded border border-border bg-surface-2 px-2 py-0.5 text-xs text-zinc-200"
              >
                {c.label}
              </li>
            ))}
            {film.topics.map((t) => (
              <li
                key={t}
                className="rounded border border-border bg-surface-2 px-2 py-0.5 text-xs capitalize text-zinc-400"
              >
                {t.replace(/-/g, " ")}
              </li>
            ))}
          </ul>
        </section>
      )}

      {film.analysis && (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight">
            Coach&rsquo;s breakdown
          </h2>
          <div className="mt-3 whitespace-pre-wrap text-pretty leading-relaxed text-zinc-300">
            {film.analysis}
          </div>
        </section>
      )}

      {film.keyMoments.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Key moments
          </h2>
          <ul className="mt-3 flex flex-col gap-1.5">
            {film.keyMoments.map((k) => (
              <li key={k.atSec} className="text-sm">
                <a
                  href={`${getWatchUrl(film.youtubeId)}&t=${k.atSec}s`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-red hover:underline"
                >
                  {readableDuration(k.atSec)}
                </a>{" "}
                <span className="text-zinc-300">{k.label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {film.related.length > 0 && (
        <section className="mt-12 border-t border-border pt-8">
          <h2 className="text-xl font-semibold tracking-tight">
            More film on these players
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {film.related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/film/${r.slug}`}
                  className="group block overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-brand-red"
                >
                  <div className="relative aspect-video bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getThumbnailUrl(r.youtubeId)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
                    />
                  </div>
                  <p className="p-3 text-sm font-medium text-white">{r.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
