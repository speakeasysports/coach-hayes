import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/admin/session";
import { repo } from "@/lib/admin/repo";
import { syncNowAction } from "./actions";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireSession();

  const [counts, sync, published] = await Promise.all([
    repo.getQueueCounts(),
    repo.getSyncStatus(),
    repo.getPublishedCounts(),
  ]);

  const needsAttention = counts["needs-tags"] + counts.ambiguous;

  return (
    <section>
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      {needsAttention === 0 && counts.unmatched === 0 ? (
        <p className="mt-6 rounded-lg border border-border bg-surface p-5 text-zinc-300">
          Nothing to review. The queue is clear.
        </p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatCard
            href="/admin/queue?bucket=needs-tags"
            label="Needs tags"
            value={counts["needs-tags"]}
            tone={counts["needs-tags"] > 0 ? "action" : "muted"}
          />
          <StatCard
            href="/admin/queue?bucket=ambiguous"
            label="Ambiguous"
            value={counts.ambiguous}
            tone={counts.ambiguous > 0 ? "action" : "muted"}
          />
          <StatCard
            href="/admin/queue?bucket=unmatched"
            label="Unmatched"
            value={counts.unmatched}
            hint="bulk archive"
          />
        </div>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-4">
        <Stat label="Live videos" value={published.videos} />
        <Stat label="Players" value={published.players} />
        <Stat label="Concepts" value={published.concepts} />
        <Stat label="Topics" value={published.topics} />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-border pt-6">
        <form action={syncNowAction}>
          <button
            type="submit"
            className="min-h-[44px] rounded-md border border-brand-red bg-brand-red/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-red/20"
          >
            Sync YouTube now
          </button>
        </form>
        <SyncLine
          state={sync.state}
          lastSyncAt={sync.lastSyncAt}
          error={sync.error}
          added={sync.videosAdded}
        />
      </div>
    </section>
  );
}

function SyncLine({
  state,
  lastSyncAt,
  error,
  added,
}: {
  state: string;
  lastSyncAt: string | null;
  error: string | null;
  added: number;
}) {
  if (state === "failed") {
    return (
      <p className="text-sm text-brand-red">
        ⚠ Sync failed {lastSyncAt ? relative(lastSyncAt) : ""} — {error}
      </p>
    );
  }
  if (state === "never-run") {
    return <p className="text-sm text-muted">Never synced.</p>;
  }
  return (
    <p className="text-sm text-muted">
      Last sync {lastSyncAt ? relative(lastSyncAt) : "—"}
      {added > 0 ? ` · ${added} new` : ""}
    </p>
  );
}

function StatCard({
  href,
  label,
  value,
  tone = "muted",
  hint,
}: {
  href: string;
  label: string;
  value: number;
  tone?: "action" | "muted";
  hint?: string;
}) {
  const border =
    tone === "action" && value > 0 ? "border-brand-red" : "border-border";
  return (
    <Link
      href={href}
      className={`rounded-lg border ${border} bg-surface p-5 transition-colors hover:border-brand-red`}
    >
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="mt-1 text-sm text-zinc-300">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xl font-semibold text-white">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}

function relative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.round(ms / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
