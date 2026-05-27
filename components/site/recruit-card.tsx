import type { Recruit } from "@/lib/board";
import { getThumbnailUrl, getWatchUrl } from "@/lib/youtube";

type Props = { recruit: Recruit };

export function RecruitCard({ recruit }: Props) {
  const heightWeight = formatHeightWeight(recruit.height, recruit.weight);

  return (
    <article className="flex h-full flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <header className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold tracking-tight text-white">
            {recruit.name}
          </h3>
          {recruit.stars != null && (
            <Stars stars={recruit.stars} />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip>{recruit.position}</Chip>
          <Chip>Class of {recruit.classYear}</Chip>
        </div>
      </header>

      <dl className="grid gap-1 text-sm text-zinc-300">
        {(heightWeight || recruit.highSchool) && (
          <div className="flex flex-wrap items-baseline gap-x-2">
            {heightWeight && (
              <>
                <dt className="sr-only">Height and weight</dt>
                <dd>{heightWeight}</dd>
              </>
            )}
            {heightWeight && recruit.highSchool && (
              <span aria-hidden className="text-muted">·</span>
            )}
            {recruit.highSchool && (
              <>
                <dt className="sr-only">High school</dt>
                <dd className="text-zinc-400">{recruit.highSchool}</dd>
              </>
            )}
          </div>
        )}
      </dl>

      <StatusChip
        status={recruit.status}
        committedTeam={recruit.committedTeam}
      />

      {recruit.videoId ? (
        <a
          href={getWatchUrl(recruit.videoId)}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-auto block overflow-hidden rounded-md border border-border bg-black transition-colors hover:border-brand-red"
          aria-label={`Film breakdown: ${recruit.name}`}
        >
          <div className="relative aspect-video">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getThumbnailUrl(recruit.videoId)}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
            />
          </div>
        </a>
      ) : (
        <p className="mt-auto text-sm text-muted">Film breakdown coming soon.</p>
      )}
    </article>
  );
}

function formatHeightWeight(
  height: string | null,
  weight: number | null,
): string | null {
  if (!height && weight == null) return null;
  if (height && weight != null) return `${height}, ${weight} lb`;
  if (height) return height;
  return `${weight} lb`;
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-border bg-surface-2 px-2 py-0.5 text-xs font-medium text-zinc-300">
      {children}
    </span>
  );
}

function Stars({ stars }: { stars: number }) {
  const filled = Math.max(0, Math.min(5, stars));
  const empty = 5 - filled;
  return (
    <span
      className="whitespace-nowrap text-sm leading-none text-brand-red"
      aria-label={`${filled} out of 5 stars`}
    >
      <span aria-hidden>{"★".repeat(filled)}</span>
      <span aria-hidden className="text-zinc-700">
        {"★".repeat(empty)}
      </span>
    </span>
  );
}

function StatusChip({
  status,
  committedTeam,
}: {
  status: Recruit["status"];
  committedTeam: string | null;
}) {
  const label =
    status === "Committed" && committedTeam
      ? `Committed to ${committedTeam}`
      : status;
  const tone =
    status === "Committed"
      ? "border-brand-red bg-brand-red/10 text-white"
      : "border-border bg-surface-2 text-zinc-300";
  return (
    <span
      className={`inline-flex w-fit items-center rounded border px-2 py-0.5 text-xs font-medium ${tone}`}
    >
      {label}
    </span>
  );
}
