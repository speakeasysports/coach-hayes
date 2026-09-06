import type { Metadata } from "next";
import Link from "next/link";
import { getConceptIndex } from "@/lib/db/public";
import {
  SECTION_ANCHOR,
  SectionNav,
  sectionId,
} from "@/components/site/section-nav";
import { getThumbnailUrl } from "@/lib/youtube";
import { filmCountLabel } from "@/lib/counts";
import { CONCEPT_FAMILIES } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Playbook",
  description:
    "Every scheme and concept Coach Hayes breaks down on film — run game, pass game, coverage, fronts and technique.",
  alternates: { canonical: "/playbook" },
};

export default async function PlaybookIndexPage() {
  const concepts = await getConceptIndex();

  if (concepts.length === 0) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-5 px-4 py-24 text-center sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight">Playbook</h1>
        <p className="text-zinc-400">Concepts are being indexed. Check back soon.</p>
      </section>
    );
  }

  const byFamily = new Map<string, typeof concepts>();
  for (const c of concepts) {
    const arr = byFamily.get(c.family) ?? [];
    arr.push(c);
    byFamily.set(c.family, arr);
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-red">
          X&rsquo;s &amp; O&rsquo;s
        </span>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Playbook</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Every concept broken down on film, grouped by what it does.{" "}
          <span className="text-zinc-500">{concepts.length} concepts</span>
        </p>
      </header>

      <SectionNav
        sections={CONCEPT_FAMILIES.filter(
          (family) => byFamily.get(family)?.length,
        ).map((family) => ({
          id: sectionId(family),
          label: family,
          count: byFamily.get(family)!.length,
        }))}
      />

      <div className="flex flex-col gap-12">
        {CONCEPT_FAMILIES.map((family) => {
          const rows = byFamily.get(family);
          if (!rows?.length) return null;
          return (
            <section
              key={family}
              id={sectionId(family)}
              className={SECTION_ANCHOR}
            >
              <h2 className="mb-4 flex items-baseline gap-2 text-2xl font-semibold capitalize tracking-tight">
                <span>{family}</span>
                <span className="text-base font-normal text-muted">{rows.length}</span>
              </h2>
              <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                {rows.map((c) => (
                  <li key={c.slug}>
                    {/*
                      The concept name carries the card, not the still. A
                      concept's thumbnail is just its most-viewed video's
                      frame, so Zone Blocking, Zone Fits and Inside Zone all
                      showed near-identical field shots and the grid was
                      unreadable at a glance. The still is now texture behind
                      the one thing that actually distinguishes these cards.
                    */}
                    <Link
                      href={`/playbook/${c.slug}`}
                      className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-lg border border-border bg-surface p-4 transition-colors hover:border-brand-red sm:aspect-[16/10]"
                    >
                      {c.thumbnailId && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={getThumbnailUrl(c.thumbnailId)}
                          alt=""
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover opacity-40 transition-opacity duration-200 group-hover:opacity-60"
                        />
                      )}
                      <span
                        aria-hidden
                        className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20"
                      />
                      <span className="relative">
                        <span className="block text-balance text-lg font-semibold leading-tight tracking-tight text-white sm:text-xl">
                          {c.label}
                        </span>
                        <span className="mt-1 block text-xs text-zinc-400">
                          {filmCountLabel(c.filmCount, c.clipCount)}
                        </span>
                      </span>
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
