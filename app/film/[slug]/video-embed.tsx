"use client";

import { useState } from "react";
import { getThumbnailUrl } from "@/lib/youtube";

/**
 * Click-to-play facade. A YouTube iframe pulls roughly a megabyte of script
 * before anyone presses play, which on a page people arrive at from search is
 * a cost paid by every visitor and used by some. The thumbnail is the real
 * maxres still, so the swap is visually seamless.
 */
export function VideoEmbed({
  youtubeId,
  title,
}: {
  youtubeId: string;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play: ${title}`}
      className="group relative block aspect-video w-full overflow-hidden rounded-lg border border-border bg-black outline-none focus-visible:border-brand-red"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getThumbnailUrl(youtubeId, "maxres")}
        alt=""
        className="h-full w-full object-cover transition-opacity group-hover:opacity-80"
      />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/80 bg-black/60 transition-colors group-hover:border-brand-red group-hover:bg-brand-red/80">
          <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-white" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
    </button>
  );
}
