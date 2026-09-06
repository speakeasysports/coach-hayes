import type { Metadata } from "next";
import Link from "next/link";
import { getBigBoard, type BoardPlayer } from "@/lib/db/public";
import { POSITIONS, type Position } from "@/lib/schema";
import { FilterBar } from "@/components/site/filter-bar";
import { RecruitCard } from "@/components/site/recruit-card";
import { getCopy } from "@/lib/content/get-copy";
import type { Copy } from "@/lib/content/copy";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return {
    title: "Big Board",
    description: copy["bigBoard.meta.description"],
    alternates: { canonical: "/big-board" },
  };
}

type Search = { status?: string; class?: string };

function parseClass(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 2020 && n <= 2035 ? n : undefined;
}

export default async function BigBoardPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const [all, copy] = await Promise.all([getBigBoard(), getCopy()]);
  if (all.length === 0) return <EmptyBoard copy={copy} />;

  const sp = await searchParams;
  // Status is validated against what the board actually holds rather than the
  // full career enum — an unknown value simply falls through to no filter.
  const known = new Set(all.map((p) => p.status));
  const activeStatus =
    sp.status && known.has(sp.status as BoardPlayer["status"])
      ? sp.status
      : undefined;
  const activeClass = parseClass(sp.class);

  let filtered = all;
  if (activeStatus) filtered = filtered.filter((p) => p.status === activeStatus);
  if (activeClass) filtered = filtered.filter((p) => p.classYear === activeClass);

  const groups = new Map<Position, BoardPlayer[]>();
  for (const p of filtered) {
    const arr = groups.get(p.position) ?? [];
    arr.push(p);
    groups.set(p.position, arr);
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-red">
          {copy["bigBoard.eyebrow"]}
        </span>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
          {copy["bigBoard.heading"]}
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          {copy["bigBoard.intro"]}{" "}
          <span className="text-zinc-500">{all.length} on the board</span>
        </p>
      </header>

      <FilterBar
        players={all}
        activeStatus={activeStatus}
        activeClass={activeClass}
      />

      {filtered.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-4 rounded-xl border border-border bg-surface p-10 text-center">
          <p className="text-lg font-semibold text-white">
            {copy["bigBoard.noMatches"]}
          </p>
          <Link
            href="/big-board"
            className="rounded-md border border-border bg-surface-2 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-brand-red"
          >
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="mt-10 flex flex-col gap-12">
          {POSITIONS.map((pos) => {
            const rows = groups.get(pos);
            if (!rows?.length) return null;
            return (
              <section key={pos}>
                <h2 className="mb-4 flex items-baseline gap-2 text-2xl font-semibold tracking-tight">
                  <span>{pos}</span>
                  <span className="text-base font-normal text-muted">
                    {rows.length}
                  </span>
                </h2>
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rows.map((p) => (
                    <li key={p.slug}>
                      <RecruitCard player={p} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EmptyBoard({ copy }: { copy: Copy }) {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-5 px-4 py-24 text-center sm:px-6">
      <span className="text-xs font-semibold uppercase tracking-wider text-brand-red">
        {copy["bigBoard.eyebrow"]}
      </span>
      <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
        {copy["bigBoard.empty.heading"]}
      </h1>
      <p className="max-w-xl text-pretty text-base text-zinc-400">
        {copy["bigBoard.empty.body"]}
      </p>
      {/*
        The board is linked from the nav and a homepage card, so this state is
        reachable three ways. Sending people back to the content instead of
        leaving them at a dead end.
      */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/players"
          className="rounded-md bg-brand-red px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-red-hover"
        >
          Browse players →
        </Link>
        <Link
          href="/film"
          className="rounded-md border border-border bg-surface px-5 py-3 text-base font-semibold text-white transition-colors hover:border-brand-red"
        >
          All film
        </Link>
      </div>
    </section>
  );
}
