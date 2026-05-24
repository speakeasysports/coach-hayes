import Link from "next/link";
import {
  RECRUIT_STATUSES,
  type Recruit,
  type RecruitStatus,
} from "@/lib/content/types";

type Props = {
  recruits: Recruit[];
  activeStatus?: RecruitStatus;
  activeClass?: number;
};

const STATUS_LABELS: Record<RecruitStatus, string> = {
  target: "Target",
  offered: "Offered",
  visit: "Visit",
  commit: "Commit",
  signed: "Signed",
  "flip-watch": "Flip watch",
  decommit: "Decommit",
  "off-board": "Off board",
};

export function FilterBar({ recruits, activeStatus, activeClass }: Props) {
  const yearOptions = Array.from(
    new Set(recruits.map((r) => r.classYear)),
  ).sort((a, b) => b - a);

  // Faceted counts: each row's counts reflect the OTHER row's active filter,
  // so the number on a chip = what you'd see if you clicked it.
  const classScoped = activeClass
    ? recruits.filter((r) => r.classYear === activeClass)
    : recruits;
  const statusScoped = activeStatus
    ? recruits.filter((r) => r.status === activeStatus)
    : recruits;

  const statusCounts = new Map<RecruitStatus, number>();
  for (const r of classScoped) {
    statusCounts.set(r.status, (statusCounts.get(r.status) ?? 0) + 1);
  }

  const classCounts = new Map<number, number>();
  for (const r of statusScoped) {
    classCounts.set(r.classYear, (classCounts.get(r.classYear) ?? 0) + 1);
  }

  function buildHref(
    dim: "status" | "class",
    value: string | number | undefined,
  ): string {
    const params = new URLSearchParams();
    if (dim === "status") {
      if (value) params.set("status", String(value));
      if (activeClass != null) params.set("class", String(activeClass));
    } else {
      if (activeStatus) params.set("status", activeStatus);
      if (value != null) params.set("class", String(value));
    }
    const qs = params.toString();
    return qs ? `/big-board?${qs}` : "/big-board";
  }

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6">
      <ChipRow label="Status">
        <Chip
          href={buildHref("status", undefined)}
          active={!activeStatus}
          count={classScoped.length}
        >
          All
        </Chip>
        {RECRUIT_STATUSES.map((s) => (
          <Chip
            key={s}
            href={buildHref("status", s)}
            active={activeStatus === s}
            count={statusCounts.get(s) ?? 0}
          >
            {STATUS_LABELS[s]}
          </Chip>
        ))}
      </ChipRow>

      {yearOptions.length > 0 && (
        <ChipRow label="Class">
          <Chip
            href={buildHref("class", undefined)}
            active={activeClass == null}
            count={statusScoped.length}
          >
            All
          </Chip>
          {yearOptions.map((y) => (
            <Chip
              key={y}
              href={buildHref("class", y)}
              active={activeClass === y}
              count={classCounts.get(y) ?? 0}
            >
              {y}
            </Chip>
          ))}
        </ChipRow>
      )}
    </div>
  );
}

function ChipRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count: number;
  children: React.ReactNode;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors";
  const tone = active
    ? "border-brand-red bg-brand-red/10 text-white font-semibold"
    : "border-border bg-surface text-zinc-300 hover:border-brand-red hover:text-white";

  return (
    <Link href={href} className={`${base} ${tone}`}>
      <span>{children}</span>
      <span className={active ? "text-white/80" : "text-zinc-500"}>
        {count}
      </span>
    </Link>
  );
}
