import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPlayerPage,
  getPublishedPlayerSlugs,
  type PublicVideo,
} from "@/lib/db/public";
import { getThumbnailUrl, getWatchUrl } from "@/lib/youtube";
import { filmCountLabel } from "@/lib/counts";

type Props = { params: Promise<{ slug: string }> };

/**
 * All player pages are generated at build time. dynamicParams=false means an
 * unknown slug 404s rather than rendering on demand — a page invented from a
 * URL would be thin content, which is the opposite of the point.
 */
export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getPublishedPlayerSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPlayerPage(slug);
  if (!data) return {};

  const { player, videos } = data;
  const bits = [player.position, player.highSchool, hometown(player)].filter(
    Boolean,
  );
  const counts = filmCountLabel(
    videos.filter((v) => !v.isShort).length,
    videos.filter((v) => v.isShort).length,
  );
  const description = `${counts} of ${player.name} from Coach Hayes${
    bits.length ? ` — ${bits.join(", ")}` : ""
  }.`;

  return {
    // Long-tail intent: people search a name plus "film" or "breakdown".
    title: `${player.name} — Film Breakdowns`,
    description,
    alternates: { canonical: `/players/${player.slug}` },
    openGraph: {
      title: `${player.name} — Film Breakdowns`,
      description,
      type: "profile",
      images: videos[0]
        ? [{ url: getThumbnailUrl(videos[0].youtubeId, "maxres") }]
        : undefined,
    },
  };
}

export default async function PlayerPage({ params }: Props) {
  const { slug } = await params;
  const data = await getPlayerPage(slug);
  if (!data) notFound();

  const { player, videos, concepts } = data;
  const longForm = videos.filter((v) => !v.isShort);
  const shorts = videos.filter((v) => v.isShort);

  // Most players have one or two breakdowns. A fixed three-column grid left
  // the single card floating against two empty columns, which read as a
  // loading failure rather than a short filmography.
  const filmCols =
    longForm.length >= 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2";

  return (
    <article className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <Link
        href="/players"
        className="text-sm text-muted transition-colors hover:text-white"
      >
        ← All players
      </Link>

      <header className="mt-4 border-b border-border pb-8">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {player.name}
          </h1>
          {player.stars != null && <Stars stars={player.stars} />}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Chip>{player.position}</Chip>
          {player.classYear && <Chip>Class of {player.classYear}</Chip>}
          <StatusChip status={player.status} committedTo={player.committedTo} />
        </div>

        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-300">
          {measurements(player) && (
            <Fact label="Measurements" value={measurements(player)!} />
          )}
          {player.highSchool && (
            <Fact label="High school" value={player.highSchool} />
          )}
          {hometown(player) && <Fact label="Hometown" value={hometown(player)!} />}
          {player.rosterYears.length > 0 && (
            <Fact label="On roster" value={player.rosterYears.join(", ")} />
          )}
        </dl>

        {player.bio && (
          <p className="mt-5 max-w-2xl text-pretty text-zinc-300">{player.bio}</p>
        )}
      </header>

      {longForm.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight">
            Film breakdowns
            <span className="ml-2 text-base font-normal text-muted">
              {longForm.length}
            </span>
          </h2>
          <ul className={`mt-5 grid gap-5 ${filmCols}`}>
            {longForm.map((v) => (
              <li key={v.youtubeId}>
                <VideoCard video={v} playerName={player.name} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {shorts.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">
            Clips
            <span className="ml-2 text-base font-normal text-muted">
              {shorts.length}
            </span>
          </h2>
          <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {shorts.map((v) => (
              <li key={v.youtubeId}>
                <VideoCard video={v} playerName={player.name} compact />
              </li>
            ))}
          </ul>
        </section>
      )}

      {concepts.length > 0 && (
        <section className="mt-12 border-t border-border pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Concepts covered
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {concepts.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/playbook/${c.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-sm text-zinc-300 transition-colors hover:border-brand-red hover:text-white"
                >
                  {c.label}
                  <span className="text-zinc-500">{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

/**
 * Long-form film goes to its own page; shorts, which have none, still go out to
 * YouTube. Player pages are the surface search traffic lands on, so every card
 * that CAN keep a visitor on the site should — before this they all pointed
 * straight at YouTube and /film/[slug] was reachable only from /film.
 */
function VideoCard({
  video,
  playerName,
  compact,
}: {
  video: PublicVideo;
  playerName: string;
  compact?: boolean;
}) {
  const shell =
    "group block overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-brand-red";
  const label = `${video.title} — ${
    video.hasFilmPage ? "film breakdown" : "clip"
  } of ${playerName}`;

  const body = (
    <>
      <div className="relative aspect-video bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getThumbnailUrl(video.youtubeId)}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
        />
      </div>
      <div className="p-3">
        <p
          className={`font-medium text-white ${compact ? "text-xs" : "text-sm"}`}
        >
          {video.title}
        </p>
        <p className="mt-1 text-xs text-muted">
          {video.publishedAt.slice(0, 10)}
          {video.views > 0 && ` · ${video.views.toLocaleString()} views`}
        </p>
      </div>
    </>
  );

  return video.hasFilmPage ? (
    <Link href={`/film/${video.slug}`} className={shell} aria-label={label}>
      {body}
    </Link>
  ) : (
    <a
      href={getWatchUrl(video.youtubeId)}
      target="_blank"
      rel="noopener noreferrer"
      className={shell}
      aria-label={`${label} (opens on YouTube)`}
    >
      {body}
    </a>
  );
}

function measurements(p: {
  heightIn: number | null;
  weightLb: number | null;
}): string | null {
  const h = p.heightIn ? `${Math.floor(p.heightIn / 12)}'${p.heightIn % 12}"` : null;
  const w = p.weightLb ? `${p.weightLb} lb` : null;
  return [h, w].filter(Boolean).join(", ") || null;
}

function hometown(p: { city: string | null; state: string | null }): string | null {
  return [p.city, p.state].filter(Boolean).join(", ") || null;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted">{label}</dt>
      <dd className="text-zinc-200">{value}</dd>
    </div>
  );
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
      className="whitespace-nowrap text-lg leading-none text-brand-red"
      aria-label={`${filled} out of 5 stars`}
    >
      <span aria-hidden>{"★".repeat(filled)}</span>
      <span aria-hidden className="text-zinc-700">
        {"★".repeat(5 - filled)}
      </span>
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
  const tone =
    status === "committed" || status === "signed" || status === "nfl"
      ? "border-brand-red bg-brand-red/10 text-white"
      : "border-border bg-surface-2 text-zinc-300";
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium capitalize ${tone}`}
    >
      {label}
    </span>
  );
}
