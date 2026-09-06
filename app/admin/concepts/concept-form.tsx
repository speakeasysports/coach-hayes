"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CONCEPT_FAMILIES, type ConceptFamily } from "@/lib/schema";
import {
  deleteConceptAction,
  previewPatternsAction,
  saveConceptAction,
} from "../actions";
import type { PatternPreview } from "@/lib/admin/contract";

type Props = {
  id: string | null;
  slug: string | null;
  label: string;
  family: ConceptFamily;
  matchPatterns: string[];
  explainer: string | null;
  filmCount: number;
};

export function ConceptForm(props: Props) {
  const router = useRouter();
  const [label, setLabel] = useState(props.label);
  const [family, setFamily] = useState<ConceptFamily>(props.family);
  // One pattern per line — a textarea is the honest control for a list of
  // regexes, and avoids a fiddly add/remove row UI for something edited rarely.
  const [patterns, setPatterns] = useState(props.matchPatterns.join("\n"));
  const [explainer, setExplainer] = useState(props.explainer ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState<PatternPreview | null>(null);
  const [pending, startTransition] = useTransition();

  const patternLines = () =>
    patterns
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);
  const patternCount = patternLines().length;

  const check = () => {
    setPreview(null);
    startTransition(async () => {
      setPreview(await previewPatternsAction(patternLines()));
    });
  };

  const save = () => {
    setError(null);
    setSaved(false);
    if (!label.trim()) {
      setError("Give the concept a name.");
      return;
    }
    startTransition(async () => {
      const res = await saveConceptAction(props.id, {
        label: label.trim(),
        family,
        matchPatterns: patterns
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean),
        explainer: explainer.trim() || null,
      });
      if (res.ok) {
        setSaved(true);
        if (!props.id) router.push("/admin/concepts");
        else router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const res = await deleteConceptAction(props.id!);
      if (res.ok) router.push("/admin/concepts");
      else setError(res.error);
    });
  };

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="rounded-lg border border-border bg-surface p-5">
        <label htmlFor="label" className="block text-sm text-zinc-300">
          Name
        </label>
        <input
          id="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Zone Blocking"
          className="mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-white outline-none focus:border-brand-red"
        />
        {props.slug && (
          <p className="mt-1.5 text-xs text-muted">
            Web address stays{" "}
            <code className="text-zinc-400">/playbook/{props.slug}</code> — renaming
            won&rsquo;t break existing links.
          </p>
        )}

        <label htmlFor="family" className="mt-4 block text-sm text-zinc-300">
          Group
        </label>
        <select
          id="family"
          value={family}
          onChange={(e) => setFamily(e.target.value as ConceptFamily)}
          className="mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-2 px-3 py-2 capitalize text-white outline-none focus:border-brand-red sm:w-72"
        >
          {CONCEPT_FAMILIES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Auto-tagging
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          {patternCount === 0
            ? "Nothing is set, so this concept is never applied automatically."
            : `${patternCount} search ${
                patternCount === 1 ? "pattern" : "patterns"
              } decide which videos get tagged with this concept.`}
        </p>

        <details className="mt-3 rounded-md border border-border bg-surface-2">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm text-zinc-300 marker:content-none">
            Edit the patterns{" "}
            <span className="text-muted">— technical, handle with care</span>
          </summary>
          <div className="border-t border-border p-4">
            <p className="text-xs leading-relaxed text-muted">
              One per line. A plain phrase like <code>buck sweep</code> works,
              but most of these are written in a pattern language — that is what{" "}
              <code>\b</code> and <code>(?:…)</code> are doing. Editing one
              changes which videos get tagged on the next sync, so check before
              you save.
            </p>
            <label htmlFor="patterns" className="mt-3 block text-sm text-zinc-300">
              Patterns
            </label>
            <textarea
              id="patterns"
              value={patterns}
              onChange={(e) => {
                setPatterns(e.target.value);
                setPreview(null);
              }}
              rows={5}
              spellCheck={false}
              placeholder={"buck sweep"}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-white outline-none focus:border-brand-red"
            />

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={check}
                disabled={pending || patternCount === 0}
                className="min-h-[40px] rounded-md border border-border bg-surface px-3 text-sm text-white transition-colors hover:border-brand-red disabled:opacity-40"
              >
                {pending ? "Checking…" : "Check what these match"}
              </button>
              {preview && !preview.error && (
                <span className="text-sm text-zinc-300">
                  {preview.total === 0
                    ? "Matches nothing on the site."
                    : `Matches ${preview.total} live ${
                        preview.total === 1 ? "video" : "videos"
                      }.`}
                </span>
              )}
            </div>

            {preview?.error && (
              <p className="mt-3 rounded border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-sm text-white">
                {preview.error}
              </p>
            )}
            {preview && !preview.error && preview.samples.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1 text-xs text-muted">
                {preview.samples.map((t) => (
                  <li key={t} className="truncate">
                    · {t}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5">
        <label htmlFor="explainer" className="block text-sm text-zinc-300">
          Description <span className="text-muted">(optional)</span>
        </label>
        <p className="mt-1 text-xs text-muted">
          Shown at the top of the playbook page. This is the same text as the{" "}
          <Link
            href="/admin/write"
            className="underline transition-colors hover:text-white"
          >
            Descriptions
          </Link>{" "}
          tab — edit it in either place.
        </p>
        <textarea
          id="explainer"
          value={explainer}
          onChange={(e) => setExplainer(e.target.value)}
          rows={4}
          placeholder="A sentence or two explaining the concept, shown at the top of the playbook page."
          className="mt-1 w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-white outline-none focus:border-brand-red"
        />
      </div>

      {error && (
        <p role="alert" className="rounded border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-sm text-white">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="min-h-[44px] rounded-md border border-brand-red bg-brand-red/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-red/20 disabled:opacity-40"
        >
          {pending ? "Saving…" : props.id ? "Save changes" : "Add concept"}
        </button>
        {saved && <span className="text-sm text-muted">Saved.</span>}

        {props.id && (
          <div className="ml-auto flex items-center gap-3">
            {props.filmCount > 0 ? (
              <span className="text-xs text-muted">
                Used on {props.filmCount} {props.filmCount === 1 ? "video" : "videos"} — can&rsquo;t delete
              </span>
            ) : (
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                className="min-h-[44px] rounded-md border border-border px-3 py-2 text-sm text-zinc-400 transition-colors hover:border-brand-red hover:text-white disabled:opacity-40"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
