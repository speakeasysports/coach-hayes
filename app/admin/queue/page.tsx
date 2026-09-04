import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/admin/session";
import { repo } from "@/lib/admin/repo";
import type { QueueBucket } from "@/lib/admin/contract";
import { QueueList } from "./queue-list";

export const metadata: Metadata = { title: "Queue" };
export const dynamic = "force-dynamic";

const BUCKETS: { key: QueueBucket; label: string; blurb: string }[] = [
  {
    key: "needs-tags",
    label: "Needs tags",
    blurb: "Suggestions are pre-filled. Confirm, or fix then confirm.",
  },
  {
    key: "ambiguous",
    label: "Ambiguous",
    blurb:
      "A surname matched several rostered players, so nothing was applied. Pick the right one.",
  },
  {
    key: "unmatched",
    label: "Unmatched",
    blurb:
      "Nothing matched — mostly older motivational shorts. Select and archive in bulk; nothing is deleted.",
  },
];

function parseBucket(raw: string | undefined): QueueBucket {
  return BUCKETS.some((b) => b.key === raw) ? (raw as QueueBucket) : "needs-tags";
}

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ bucket?: string }>;
}) {
  await requireSession();

  const { bucket: raw } = await searchParams;
  const bucket = parseBucket(raw);

  const [counts, items, players, concepts, series] = await Promise.all([
    repo.getQueueCounts(),
    repo.getQueueItems(bucket),
    repo.searchPlayers("", 200),
    repo.searchConcepts("", 200),
    repo.listSeries(),
  ]);

  const active = BUCKETS.find((b) => b.key === bucket)!;

  return (
    <section>
      <h1 className="text-3xl font-bold tracking-tight">Review queue</h1>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-border pb-4">
        {BUCKETS.map((b) => {
          const isActive = b.key === bucket;
          return (
            <Link
              key={b.key}
              href={`/admin/queue?bucket=${b.key}`}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-1 text-sm transition-colors ${
                isActive
                  ? "border-brand-red bg-brand-red/10 font-semibold text-white"
                  : "border-border bg-surface text-zinc-300 hover:border-brand-red hover:text-white"
              }`}
            >
              {b.label}
              <span className={isActive ? "text-white/80" : "text-zinc-500"}>
                {counts[b.key]}
              </span>
            </Link>
          );
        })}
      </div>

      <p className="mt-4 text-sm text-muted">{active.blurb}</p>

      {items.length === 0 ? (
        <p className="mt-8 rounded-lg border border-border bg-surface p-6 text-zinc-300">
          Nothing in this bucket.
        </p>
      ) : (
        <QueueList
          key={bucket}
          bucket={bucket}
          items={items}
          allPlayers={players}
          allConcepts={concepts}
          allSeries={series}
        />
      )}
    </section>
  );
}
