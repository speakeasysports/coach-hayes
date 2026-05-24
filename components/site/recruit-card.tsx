import type { Recruit, RecruitStatus } from "@/lib/content/types";
import { getThumbnailUrl, getWatchUrl } from "@/lib/youtube";

type Props = { recruit: Recruit };

export function RecruitCard({ recruit }: Props) {
  return (
    <article className="flex h-full flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <header className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold tracking-tight text-white">
          {recruit.name}
        </h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip>{recruit.position}</Chip>
          <Chip>Class of {recruit.classYear}</Chip>
          <StatusChip status={recruit.status} />
        </div>
      </header>

      {recruit.videoIds.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2">
          {recruit.videoIds.map((id) => (
            <li key={id}>
              <a
                href={getWatchUrl(id)}
                target="_blank"
                rel="noopener noreferrer"
                className="group block overflow-hidden rounded-md border border-border bg-black transition-colors hover:border-brand-red"
                aria-label={`Film breakdown: ${recruit.name}`}
              >
                <div className="relative aspect-video">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getThumbnailUrl(id)}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
                  />
                </div>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Film breakdown coming soon.</p>
      )}
    </article>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-border bg-surface-2 px-2 py-0.5 text-xs font-medium text-zinc-300">
      {children}
    </span>
  );
}

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

function StatusChip({ status }: { status: RecruitStatus }) {
  const tone =
    status === "commit" || status === "signed"
      ? "border-brand-red bg-brand-red/10 text-white"
      : status === "decommit" || status === "off-board"
        ? "border-border bg-surface-2 text-zinc-500"
        : "border-border bg-surface-2 text-zinc-300";

  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${tone}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
