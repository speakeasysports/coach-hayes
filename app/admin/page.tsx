import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/admin/session";
import { repo } from "@/lib/admin/repo";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireSession();

  const [counts, sync, published, writing, shelf] = await Promise.all([
    repo.getQueueCounts(),
    repo.getSyncStatus(),
    repo.getPublishedCounts(),
    repo.getWritingQueue(),
    repo.listPatreonPosts(),
  ]);

  const needsAttention = counts["needs-tags"] + counts.ambiguous;
  const unwritten =
    writing.concepts.filter((c) => c.text == null).length +
    writing.players.filter((p) => p.text == null).length;
  const liveShelf = shelf.filter((p) => p.published).length;

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

      <div className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          The rest of the job
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Job
            href="/admin/write"
            title="Descriptions"
            body={
              unwritten === 0
                ? "Every player and concept has one."
                : `${unwritten} still to write. Two or three sentences each.`
            }
            tone={unwritten > 0 ? "action" : "muted"}
          />
          <Job
            href="/admin/patreon"
            title="Patreon shelf"
            body={
              liveShelf === 0
                ? "Nothing on the shelf yet."
                : `${liveShelf} post${liveShelf === 1 ? "" : "s"} showing on the site.`
            }
          />
          <Job
            href="/admin/content"
            title="Page text"
            body="Headings and wording on the public pages."
          />
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-4">
        <Stat label="Videos published" value={published.videosPublished} />
        <Stat label="Film pages" value={published.filmPages} />
        <Stat label="Player pages" value={published.playerPages} />
        <Stat label="Playbook pages" value={published.conceptPages} />
      </div>

      <div className="mt-8 border-t border-border pt-6">
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

function Job({
  href,
  title,
  body,
  tone = "muted",
}: {
  href: string;
  title: string;
  body: string;
  tone?: "action" | "muted";
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg border p-4 transition-colors hover:border-brand-red ${
        tone === "action"
          ? "border-brand-red/50 bg-brand-red/5"
          : "border-border bg-surface"
      }`}
    >
      <span className="block font-semibold text-white">{title}</span>
      <span className="mt-1 block text-sm text-zinc-400">{body}</span>
    </Link>
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
  if (state === "never-run" || !lastSyncAt) {
    return (
      <p className="text-sm text-muted">
        No sync recorded yet. New videos arrive when the sync runs — there is
        no button here, because nothing you press in a browser can pull a
        channel.
      </p>
    );
  }
  return (
    <p className="text-sm text-muted">
      Last sync {relative(lastSyncAt)}
      {added > 0 ? ` · ${added} new video${added === 1 ? "" : "s"}` : " · nothing new"}
      . New videos arrive when the sync runs, not on a button here.
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
