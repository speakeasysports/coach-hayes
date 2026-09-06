"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deletePatreonPostAction, savePatreonPostAction } from "../actions";

type Props = {
  id: string | null;
  url: string;
  title: string;
  teaser: string | null;
  thumbnailUrl: string | null;
  postedAt: string | null;
  published: boolean;
  previewSlug: string | null;
};

export function PatreonForm(props: Props) {
  const router = useRouter();
  const [url, setUrl] = useState(props.url);
  const [title, setTitle] = useState(props.title);
  const [teaser, setTeaser] = useState(props.teaser ?? "");
  const [thumb, setThumb] = useState(props.thumbnailUrl ?? "");
  const [postedAt, setPostedAt] = useState(props.postedAt ?? "");
  const [published, setPublished] = useState(props.published);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await savePatreonPostAction(props.id, {
        url: url.trim(),
        title: title.trim(),
        teaser: teaser.trim() || null,
        thumbnailUrl: thumb.trim() || null,
        postedAt: postedAt.trim() || null,
        published,
      });
      if (res.ok) {
        setSaved(true);
        if (!props.id) router.push("/admin/patreon");
        else router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const res = await deletePatreonPostAction(props.id!);
      if (res.ok) router.push("/admin/patreon");
      else setError(res.error);
    });
  };

  return (
    <div className="mt-6 flex flex-col gap-5">
      <div className="rounded-lg border border-border bg-surface p-5">
        <Label htmlFor="url">Patreon post link</Label>
        <input
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.patreon.com/CoachHayesHudl/posts/…"
          className={input}
        />
        <Help>
          The link to the post itself, not your campaign page. Open the post on
          Patreon and copy the address bar.
        </Help>

        <Label htmlFor="title" className="mt-4">
          Title
        </Label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Seth Williams — full film study"
          className={input}
        />

        <Label htmlFor="teaser" className="mt-4">
          Teaser
        </Label>
        <textarea
          id="teaser"
          value={teaser}
          rows={2}
          onChange={(e) => setTeaser(e.target.value)}
          placeholder="One line on what is in it."
          className={`${input} min-h-[72px]`}
        />

        <Label htmlFor="postedAt" className="mt-4">
          Date posted
        </Label>
        <input
          id="postedAt"
          type="date"
          value={postedAt}
          onChange={(e) => setPostedAt(e.target.value)}
          className={`${input} max-w-[220px]`}
        />
        <Help>Newest first on the site. Leave empty and it sorts last.</Help>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Artwork
        </h2>
        {props.previewSlug ? (
          <p className="mt-3 text-sm text-zinc-300">
            A preview clip on the site already points at this post, so the card
            uses that clip&rsquo;s thumbnail and sends people to{" "}
            <a
              href={`/film/${props.previewSlug}`}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-white"
            >
              the preview page
            </a>{" "}
            first. Nothing to do here.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm text-zinc-400">
              No preview clip points at this post yet. Add one by pasting this
              same link into a video under Queue, and the card will use its
              thumbnail automatically. Until then you can give it an image.
            </p>
            <Label htmlFor="thumb" className="mt-4">
              Image link (optional)
            </Label>
            <input
              id="thumb"
              value={thumb}
              onChange={(e) => setThumb(e.target.value)}
              placeholder="https://…"
              className={input}
            />
            <Help>
              Must start with http:// or https://. Leave empty for a plain card.
            </Help>
          </>
        )}
      </div>

      <label className="flex items-center gap-3 rounded-lg border border-border bg-surface p-5 text-sm text-zinc-200">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="h-4 w-4 accent-[color:var(--brand-red,#fc0a0e)]"
        />
        Show this on the website
      </label>

      {error && (
        <p className="rounded-md border border-brand-red bg-brand-red/10 px-4 py-3 text-sm text-white">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="min-h-[44px] rounded-md bg-brand-red px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-red-hover disabled:opacity-40"
        >
          {pending ? "Saving…" : props.id ? "Save changes" : "Add to shelf"}
        </button>
        {props.id && (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="min-h-[44px] rounded-md border border-border px-4 text-sm text-zinc-300 transition-colors hover:border-brand-red hover:text-white disabled:opacity-40"
          >
            Remove from shelf
          </button>
        )}
        {saved && <span className="text-sm text-muted">Saved.</span>}
      </div>
    </div>
  );
}

const input =
  "mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-white outline-none placeholder:text-zinc-500 focus:border-brand-red";

function Label({
  htmlFor,
  className = "",
  children,
}: {
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className={`block text-sm text-zinc-300 ${className}`}>
      {children}
    </label>
  );
}

function Help({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs text-muted">{children}</p>;
}
