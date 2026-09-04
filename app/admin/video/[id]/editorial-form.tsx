"use client";

import { useState, useTransition } from "react";
import { saveEditorialAction, setPublishedAction } from "../../actions";

export function EditorialForm({
  id,
  headline,
  analysis,
  published,
}: {
  id: string;
  headline: string | null;
  analysis: string | null;
  published: boolean;
}) {
  const [h, setH] = useState(headline ?? "");
  const [a, setA] = useState(analysis ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setSaved(false);
    startTransition(async () => {
      await saveEditorialAction(id, {
        headline: h.trim() || null,
        analysis: a.trim() || null,
      });
      setSaved(true);
    });
  };

  return (
    <div className="mt-6 rounded-lg border border-border bg-surface p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
        Editorial · yours, never overwritten by sync
      </h2>

      <label htmlFor="headline" className="mt-4 block text-sm text-zinc-300">
        Headline (SEO override)
      </label>
      <input
        id="headline"
        value={h}
        onChange={(e) => setH(e.target.value)}
        placeholder="Leave empty to use the YouTube title"
        className="mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-white outline-none focus:border-brand-red"
      />

      <label htmlFor="analysis" className="mt-4 block text-sm text-zinc-300">
        Analysis (markdown)
      </label>
      <textarea
        id="analysis"
        value={a}
        onChange={(e) => setA(e.target.value)}
        rows={6}
        className="mt-1 w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-white outline-none focus:border-brand-red"
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="min-h-[44px] rounded-md border border-brand-red bg-brand-red/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-red/20 disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              await setPublishedAction(id, !published);
            })
          }
          disabled={pending}
          className="min-h-[44px] rounded-md border border-border bg-surface-2 px-4 py-2 text-sm text-white transition-colors hover:border-brand-red disabled:opacity-40"
        >
          {published ? "Unpublish" : "Publish"}
        </button>
        {saved && <span className="text-sm text-muted">Saved.</span>}
      </div>
    </div>
  );
}
