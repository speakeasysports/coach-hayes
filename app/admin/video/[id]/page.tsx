import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/admin/session";
import { repo } from "@/lib/admin/repo";
import { EditorialForm } from "./editorial-form";

export const metadata: Metadata = { title: "Video" };
export const dynamic = "force-dynamic";

export default async function VideoEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const video = await repo.getVideo(id as never);
  if (!video) notFound();

  const { synced, editorial, tags } = video;

  return (
    <section>
      <Link
        href="/admin/queue"
        className="text-sm text-muted transition-colors hover:text-white"
      >
        ← Back to queue
      </Link>

      <h1 className="mt-3 text-2xl font-bold tracking-tight">
        {editorial.headline || synced.title}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {synced.publishedAt.slice(0, 10)} · {synced.views.toLocaleString()} views
        {video.published ? " · live" : " · unpublished"}
      </p>

      {synced.missingSince && (
        <p className="mt-4 rounded border border-brand-red/40 bg-brand-red/10 p-3 text-sm text-white">
          ⚠ This video is no longer on YouTube (since{" "}
          {synced.missingSince.slice(0, 10)}). Tags are preserved.
        </p>
      )}

      {/* Synced block is visually separated so it is obvious what a re-sync
          will overwrite — the field-ownership rule made visible. */}
      <div className="mt-8 rounded-lg border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Synced from YouTube · read-only
        </h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <Row label="YouTube ID" value={synced.youtubeId} mono />
          <Row label="Slug" value={synced.slug} mono />
          <Row label="Duration" value={`${synced.durationSec}s`} />
          <Row label="Views" value={synced.views.toLocaleString()} />
          <div className="sm:col-span-2">
            <dt className="text-muted">Title</dt>
            <dd className="text-zinc-200">{synced.title}</dd>
          </div>
        </dl>
      </div>

      <EditorialForm
        id={video.id}
        headline={editorial.headline}
        analysis={editorial.analysis}
        patreonUrl={editorial.patreonUrl}
        published={video.published}
      />

      <div className="mt-8 rounded-lg border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Tags
        </h2>
        <dl className="mt-3 flex flex-col gap-2 text-sm">
          <TagRow label="Players" values={tags.players.map((p) => p.name)} />
          <TagRow label="Concepts" values={tags.concepts.map((c) => c.label)} />
          <TagRow label="Topics" values={tags.topics} />
          <TagRow label="Series" values={tags.series ? [tags.series.name] : []} />
          <TagRow
            label="Position groups"
            values={video.derivedPositionGroups}
            hint={
              tags.positionGroupsOverride.length > 0
                ? "includes manual override"
                : "derived from players"
            }
          />
        </dl>
        <p className="mt-3 text-xs text-muted">
          Edit tags from the{" "}
          <Link href="/admin/queue" className="underline hover:text-white">
            queue
          </Link>
          .
        </p>
      </div>
    </section>
  );
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

function TagRow({
  label,
  values,
  hint,
}: {
  label: string;
  values: readonly string[];
  hint?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <dt className="w-32 shrink-0 text-muted">{label}</dt>
      <dd className="flex flex-wrap gap-1.5">
        {values.length === 0 ? (
          <span className="text-zinc-600">none</span>
        ) : (
          values.map((v) => (
            <span
              key={v}
              className="rounded border border-border bg-surface-2 px-2 py-0.5 text-xs text-zinc-200"
            >
              {v}
            </span>
          ))
        )}
        {hint && <span className="text-xs text-muted">({hint})</span>}
      </dd>
    </div>
  );
}
