import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/admin/session";
import { repo } from "@/lib/admin/repo";
import { PlayerForm } from "./player-form";

export const metadata: Metadata = { title: "Player" };
export const dynamic = "force-dynamic";

export default async function PlayerEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const player = await repo.getPlayer(id as never);
  if (!player) notFound();

  const { synced, editable } = player;

  return (
    <section>
      <Link
        href="/admin/players"
        className="text-sm text-muted transition-colors hover:text-white"
      >
        ← Back to players
      </Link>

      <h1 className="mt-3 text-2xl font-bold tracking-tight">{player.name}</h1>
      <p className="mt-1 text-sm text-muted">
        {player.position} · {player.videoCount}{" "}
        {player.videoCount === 1 ? "video" : "videos"}
        {player.videoCount === 0 && " · not publishable"}
      </p>

      <div className="mt-8 rounded-lg border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Synced from CFBD · read-only
        </h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <Row label="CFBD ID" value={synced.cfbdId ?? "—"} mono />
          <Row
            label="Roster years"
            value={synced.rosterYears.join(", ") || "—"}
          />
          <Row
            label="Height"
            value={synced.heightIn ? fmtHeight(synced.heightIn) : "—"}
          />
          <Row
            label="Weight"
            value={synced.weightLb ? `${synced.weightLb} lb` : "—"}
          />
          <Row label="High school" value={synced.highSchool ?? "—"} />
          <Row
            label="Hometown"
            value={
              [synced.city, synced.state].filter(Boolean).join(", ") || "—"
            }
          />
        </dl>
      </div>

      <PlayerForm
        id={player.id}
        status={editable.status}
        onBigBoard={editable.onBigBoard}
        aliases={editable.aliases}
        bio={editable.bio}
      />
    </section>
  );
}

function fmtHeight(inches: number): string {
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className={mono ? "font-mono text-zinc-200" : "text-zinc-200"}>
        {value}
      </dd>
    </div>
  );
}
