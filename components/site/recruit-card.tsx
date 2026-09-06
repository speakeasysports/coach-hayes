import Link from "next/link";
import type { BoardPlayer } from "@/lib/db/public";
import { getThumbnailUrl } from "@/lib/youtube";
import { filmCountLabel } from "@/lib/counts";

/**
 * A Big Board card. When the player has published film the whole card links
 * through to their page — the board is a way into the film room, not a
 * dead-end list.
 */
export function RecruitCard({ player }: { player: BoardPlayer }) {
  const linked = player.filmCount + player.clipCount > 0;
  const body = (
    <>
      {player.thumbnailId && (
        <div className="relative aspect-video bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getThumbnailUrl(player.thumbnailId)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <header className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold tracking-tight text-white">
              {player.name}
            </h3>
            {player.stars != null && <Stars stars={player.stars} />}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip>{player.position}</Chip>
            {player.classYear && <Chip>Class of {player.classYear}</Chip>}
          </div>
        </header>

        {(measurements(player) || player.highSchool) && (
          <p className="text-sm text-zinc-300">
            {measurements(player)}
            {measurements(player) && player.highSchool && (
              <span className="text-muted"> · </span>
            )}
            {player.highSchool && (
              <span className="text-zinc-400">{player.highSchool}</span>
            )}
          </p>
        )}

        <StatusChip status={player.status} committedTo={player.committedTo} />

        <p className="mt-auto text-sm text-muted">
          {linked
            ? `${filmCountLabel(player.filmCount, player.clipCount)} →`
            : "Film breakdown coming soon."}
        </p>
      </div>
    </>
  );

  const shell =
    "group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors";

  return linked ? (
    <Link href={`/players/${player.slug}`} className={`${shell} hover:border-brand-red`}>
      {body}
    </Link>
  ) : (
    <article className={shell}>{body}</article>
  );
}

function measurements(p: { heightIn: number | null; weightLb: number | null }) {
  const h = p.heightIn
    ? `${Math.floor(p.heightIn / 12)}'${p.heightIn % 12}"`
    : null;
  const w = p.weightLb ? `${p.weightLb} lb` : null;
  return [h, w].filter(Boolean).join(", ") || null;
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
  return (
    <span
      className="whitespace-nowrap text-sm leading-none text-brand-red"
      aria-label={`${filled} out of 5 stars`}
    >
      <span aria-hidden>{"★".repeat(filled)}</span>
      <span aria-hidden className="text-zinc-700">{"★".repeat(5 - filled)}</span>
    </span>
  );
}

function StatusChip({
  status,
  committedTo,
}: {
  status: string;
  committedTo: string | null;
}) {
  const label =
    status === "committed" && committedTo
      ? `Committed to ${committedTo}`
      : status.replace(/-/g, " ");
  const hot = ["committed", "signed", "enrolled", "active"].includes(status);
  return (
    <span
      className={`inline-flex w-fit items-center rounded border px-2 py-0.5 text-xs font-medium capitalize ${
        hot
          ? "border-brand-red bg-brand-red/10 text-white"
          : "border-border bg-surface-2 text-zinc-300"
      }`}
    >
      {label}
    </span>
  );
}
