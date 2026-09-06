import Link from "next/link";
import type { BoardPlayer } from "@/lib/db/public";

type Props = {
  players: BoardPlayer[];
  activeStatus?: string;
  activeClass?: number;
};

/**
 * Status options come from the data, not the full PlayerStatus enum — that
 * enum spans the whole career from "target" to "nfl", and showing fifteen
 * chips for a board carrying three of them is noise.
 */
export function FilterBar({ players, activeStatus, activeClass }: Props) {
  const statuses = [...new Set(players.map((p) => p.status))].sort();
  const years = [...new Set(players.map((p) => p.classYear).filter(Boolean))]
    .sort((a, b) => (b as number) - (a as number)) as number[];

  const classScoped = activeClass
    ? players.filter((p) => p.classYear === activeClass)
    : players;
  const statusScoped = activeStatus
    ? players.filter((p) => p.status === activeStatus)
    : players;

  const href = (dim: "status" | "class", value: string | number | undefined) => {
    const q = new URLSearchParams();
    if (dim === "status") {
      if (value) q.set("status", String(value));
      if (activeClass != null) q.set("class", String(activeClass));
    } else {
      if (activeStatus) q.set("status", activeStatus);
      if (value != null) q.set("class", String(value));
    }
    const s = q.toString();
    return s ? `/big-board?${s}` : "/big-board";
  };

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6">
      {statuses.length > 1 && (
        <Row label="Status">
          <Chip href={href("status", undefined)} active={!activeStatus} count={classScoped.length}>
            All
          </Chip>
          {statuses.map((s) => (
            <Chip
              key={s}
              href={href("status", s)}
              active={activeStatus === s}
              count={classScoped.filter((p) => p.status === s).length}
            >
              {s.replace(/-/g, " ")}
            </Chip>
          ))}
        </Row>
      )}

      {years.length > 1 && (
        <Row label="Class">
          <Chip href={href("class", undefined)} active={activeClass == null} count={statusScoped.length}>
            All
          </Chip>
          {years.map((y) => (
            <Chip
              key={y}
              href={href("class", y)}
              active={activeClass === y}
              count={statusScoped.filter((p) => p.classYear === y).length}
            >
              {y}
            </Chip>
          ))}
        </Row>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
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
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm capitalize transition-colors ${
        active
          ? "border-brand-red bg-brand-red/10 font-semibold text-white"
          : "border-border bg-surface text-zinc-300 hover:border-brand-red hover:text-white"
      }`}
    >
      <span>{children}</span>
      <span className={active ? "text-white/80" : "text-zinc-500"}>{count}</span>
    </Link>
  );
}
