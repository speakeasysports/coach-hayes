import type { Metadata } from "next";
import Link from "next/link";
import { getPlayerIndex } from "@/lib/db/public";
import { getThumbnailUrl } from "@/lib/youtube";
import { filmCountLabel } from "@/lib/counts";
import { getCopy } from "@/lib/content/get-copy";
import {
  SECTION_ANCHOR,
  SectionNav,
  sectionId,
} from "@/components/site/section-nav";
import { POSITIONS, POSITION_GROUPS, type Position } from "@/lib/schema";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return {
    title: "Players",
    description: copy["players.meta.description"],
    alternates: { canonical: "/players" },
  };
}

export default async function PlayersIndexPage() {
  const [players, copy] = await Promise.all([getPlayerIndex(), getCopy()]);

  if (players.length === 0) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-5 px-4 py-24 text-center sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight">
          {copy["players.heading"]}
        </h1>
        <p className="text-zinc-400">{copy["players.empty"]}</p>
      </section>
    );
  }

  const byPosition = new Map<Position, typeof players>();
  for (const p of players) {
    const arr = byPosition.get(p.position) ?? [];
    arr.push(p);
    byPosition.set(p.position, arr);
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-red">
          {copy["players.eyebrow"]}
        </span>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
          {copy["players.heading"]}
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          {copy["players.intro"]}{" "}
          <span className="text-zinc-500">
            {players.length} players ·{" "}
            {filmCountLabel(
              players.reduce((n, p) => n + p.filmCount, 0),
              players.reduce((n, p) => n + p.clipCount, 0),
            )}
          </span>
        </p>
      </header>

      <SectionNav
        sections={POSITIONS.filter((pos) => byPosition.get(pos)?.length).map(
          (pos) => ({
            id: sectionId(pos),
            label: pos,
            count: byPosition.get(pos)!.length,
          }),
        )}
      />

      <div className="flex flex-col gap-12">
        {POSITIONS.map((pos) => {
          const rows = byPosition.get(pos);
          if (!rows?.length) return null;
          return (
            <section key={pos} id={sectionId(pos)} className={SECTION_ANCHOR}>
              <h2 className="mb-4 flex items-baseline gap-2 text-2xl font-semibold tracking-tight">
                {POSITION_GROUPS.includes(pos as (typeof POSITION_GROUPS)[number]) ? (
                  <Link
                    href={`/positions/${pos.toLowerCase()}`}
                    className="transition-colors hover:text-brand-red"
                  >
                    {pos}
                  </Link>
                ) : (
                  <span>{pos}</span>
                )}
                <span className="text-base font-normal text-muted">
                  {rows.length}
                </span>
              </h2>
              <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                {rows.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/players/${p.slug}`}
                      className="group block overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-brand-red"
                    >
                      <div className="relative aspect-video bg-black">
                        {p.latestThumbnailId && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={getThumbnailUrl(p.latestThumbnailId)}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                          />
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-semibold text-white">{p.name}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {filmCountLabel(p.filmCount, p.clipCount)}
                          {p.stars != null && ` · ${p.stars}★`}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </section>
  );
}
