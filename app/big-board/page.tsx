import type { Metadata } from "next";
import Link from "next/link";
import { content } from "@/lib/content";
import {
  POSITIONS,
  RECRUIT_STATUSES,
  type Position,
  type Recruit,
  type RecruitStatus,
} from "@/lib/content/types";
import {
  recruitsByClassYear,
  recruitsByStatus,
} from "@/lib/content/queries";
import { FilterBar } from "@/components/site/filter-bar";
import { RecruitCard } from "@/components/site/recruit-card";

export const metadata: Metadata = {
  title: "Big Board",
  description:
    "Every Georgia recruit by position — each name linked to a Coach Hayes film breakdown.",
};

type Search = { status?: string; class?: string };

function parseStatus(raw: string | undefined): RecruitStatus | undefined {
  if (!raw) return undefined;
  return (RECRUIT_STATUSES as readonly string[]).includes(raw)
    ? (raw as RecruitStatus)
    : undefined;
}

function parseClass(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 2024 && n <= 2035 ? n : undefined;
}

function groupByPosition(recruits: Recruit[]): Map<Position, Recruit[]> {
  const groups = new Map<Position, Recruit[]>();
  for (const r of recruits) {
    const arr = groups.get(r.position) ?? [];
    arr.push(r);
    groups.set(r.position, arr);
  }
  return groups;
}

export default async function BigBoardPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const all = await content.getRecruits();

  if (all.length === 0) {
    return <EmptyBoard />;
  }

  const sp = await searchParams;
  const activeStatus = parseStatus(sp.status);
  const activeClass = parseClass(sp.class);

  let filtered = all;
  if (activeStatus) filtered = recruitsByStatus(filtered, activeStatus);
  if (activeClass) filtered = recruitsByClassYear(filtered, activeClass);

  const groups = groupByPosition(filtered);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-red">
          Recruits
        </span>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
          The Big Board
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Every Georgia recruit by position. Each name links to a Coach Hayes
          film breakdown.
        </p>
      </header>

      <FilterBar
        recruits={all}
        activeStatus={activeStatus}
        activeClass={activeClass}
      />

      {filtered.length === 0 ? (
        <EmptyFilterState
          activeStatus={activeStatus}
          activeClass={activeClass}
        />
      ) : (
        <div className="mt-10 flex flex-col gap-12">
          {POSITIONS.map((pos) => {
            const rows = groups.get(pos);
            if (!rows || rows.length === 0) return null;
            return (
              <PositionSection key={pos} position={pos} recruits={rows} />
            );
          })}
        </div>
      )}
    </section>
  );
}

function PositionSection({
  position,
  recruits,
}: {
  position: Position;
  recruits: Recruit[];
}) {
  return (
    <section>
      <h2 className="mb-4 flex items-baseline gap-2 text-2xl font-semibold tracking-tight">
        <span>{position}</span>
        <span className="text-base font-normal text-muted">
          {recruits.length}
        </span>
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recruits.map((r) => (
          <li key={r.id}>
            <RecruitCard recruit={r} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function EmptyFilterState({
  activeStatus,
  activeClass,
}: {
  activeStatus?: RecruitStatus;
  activeClass?: number;
}) {
  const parts: string[] = [];
  if (activeStatus) parts.push(`status: ${activeStatus}`);
  if (activeClass) parts.push(`class: ${activeClass}`);

  return (
    <div className="mt-12 flex flex-col items-center gap-4 rounded-xl border border-border bg-surface p-10 text-center">
      <p className="text-lg font-semibold text-white">
        No recruits match these filters.
      </p>
      {parts.length > 0 && (
        <p className="text-sm text-muted">Active: {parts.join(" · ")}</p>
      )}
      <Link
        href="/big-board"
        className="rounded-md border border-border bg-surface-2 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-brand-red"
      >
        Clear filters
      </Link>
    </div>
  );
}

function EmptyBoard() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-5 px-4 py-24 text-center sm:px-6">
      <span className="text-xs font-semibold uppercase tracking-wider text-brand-red">
        Recruits
      </span>
      <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
        The Big Board is being built
      </h1>
      <p className="max-w-xl text-pretty text-base text-zinc-400">
        Coach is loading the first set of breakdowns. Check back soon.
      </p>
    </section>
  );
}
