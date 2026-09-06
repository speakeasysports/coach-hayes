import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPositionPage } from "@/lib/db/public";
import { getThumbnailUrl } from "@/lib/youtube";
import { filmCountLabel, filmCountTitle } from "@/lib/counts";
import { getWatchUrl } from "@/lib/youtube";
import { POSITION_GROUPS, type PositionGroup } from "@/lib/schema";

type Props = { params: Promise<{ group: string }> };

export const dynamicParams = false;

/** Only the eight hub groups. ATH/K/P carry too little film to earn a page. */
export async function generateStaticParams() {
  return POSITION_GROUPS.map((group) => ({ group: group.toLowerCase() }));
}

const FULL_NAME: Record<PositionGroup, string> = {
  QB: "Quarterbacks",
  RB: "Running Backs",
  WR: "Wide Receivers",
  TE: "Tight Ends",
  OL: "Offensive Line",
  DL: "Defensive Line",
  LB: "Linebackers",
  DB: "Defensive Backs",
};

function parseGroup(raw: string): PositionGroup | null {
  const up = raw.toUpperCase();
  return (POSITION_GROUPS as readonly string[]).includes(up)
    ? (up as PositionGroup)
    : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { group } = await params;
  const g = parseGroup(group);
  if (!g) return {};
  const page = await getPositionPage(g);
  if (!page) return {};
  const name = FULL_NAME[g];
  const description = `Coach Hayes film on Georgia ${name.toLowerCase()} — ${
    page.players.length
  } players, ${filmCountLabel(page.films.length, page.clips.length)}.`;

  return {
    title: `${name} — Georgia Film`,
    description,
    alternates: { canonical: `/positions/${g.toLowerCase()}` },
    openGraph: { title: `${name} — Georgia Film`, description },
  };
}

export default async function PositionPage({ params }: Props) {
  const { group } = await params;
  const g = parseGroup(group);
  if (!g) notFound();
  const page = await getPositionPage(g);
  if (!page) notFound();

  const name = FULL_NAME[g];
  const counts = filmCountLabel(page.films.length, page.clips.length);

  return (
    <article className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <Link
        href="/players"
        className="text-sm text-muted transition-colors hover:text-white"
      >
        ← All players
      </Link>

      <header className="mt-4 border-b border-border pb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-red">
          {g}
        </span>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{name}</h1>
        <p className="mt-3 text-zinc-400">
          {page.players.length} {page.players.length === 1 ? "player" : "players"}
          {counts && ` · ${counts}`}
        </p>
      </header>

      {page.players.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight">Players</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {page.players.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/players/${p.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-white transition-colors hover:border-brand-red"
                >
                  {p.name}
                  <span
                    className="text-xs text-muted"
                    title={filmCountTitle(p.filmCount, p.clipCount)}
                  >
                    {p.filmCount + p.clipCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {page.films.length > 0 && (
        <FilmGrid
          heading="Film"
          films={page.films}
          count={page.films.length}
        />
      )}

      {page.clips.length > 0 && (
        <section className="mt-12">
          <h2 className="flex items-baseline gap-2 text-2xl font-semibold tracking-tight">
            Clips
            <span className="text-base font-normal text-muted">
              {page.clips.length}
            </span>
          </h2>
          <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {page.clips.map((c) => (
              <li key={c.youtubeId}>
                <a
                  href={getWatchUrl(c.youtubeId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-brand-red"
                >
                  <div className="relative aspect-video bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getThumbnailUrl(c.youtubeId)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
                    />
                  </div>
                  <p className="p-3 text-xs font-medium text-white">{c.title}</p>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {page.roomFilms.length > 0 && (
        <FilmGrid
          heading={`Around the ${name.toLowerCase().replace(/s$/, "")} room`}
          blurb={`Coach Speak and room-level video that touches the ${g} group without breaking down a named player.`}
          films={page.roomFilms}
          count={page.roomFilms.length}
        />
      )}
    </article>
  );
}

function FilmGrid({
  heading,
  blurb,
  films,
  count,
}: {
  heading: string;
  blurb?: string;
  films: Array<{ slug: string; title: string; youtubeId: string }>;
  count: number;
}) {
  return (
    <section className="mt-12">
      <h2 className="flex items-baseline gap-2 text-2xl font-semibold tracking-tight">
        {heading}
        <span className="text-base font-normal text-muted">{count}</span>
      </h2>
      {blurb && <p className="mt-2 max-w-2xl text-sm text-zinc-400">{blurb}</p>}
      <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {films.map((f) => (
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
              <p className="p-3 text-sm font-medium text-white">{f.title}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
