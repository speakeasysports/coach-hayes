"use client";

import { useState, useTransition } from "react";
import type { ImportPreview, ImportRow } from "@/lib/board/import";
import { summarize } from "@/lib/board/import";
import {
  applyImportAction,
  previewImportAction,
  setImportSourceAction,
} from "../actions";

export function ImportClient({
  url: savedUrl,
  lastImportedAt,
  lastResult,
}: {
  url: string | null;
  lastImportedAt: string | null;
  lastResult: { created: number; updated: number } | null;
}) {
  const [url, setUrl] = useState(savedUrl ?? "");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<{ created: number; updated: number } | null>(null);
  const [pending, startTransition] = useTransition();

  const runPreview = () => {
    setError(null);
    setApplied(null);
    setPreview(null);
    startTransition(async () => {
      const res = await previewImportAction(url);
      if (res.ok) {
        setPreview(res.preview);
        await setImportSourceAction(url);
      } else {
        setError(res.error);
      }
    });
  };

  const apply = () => {
    if (!preview) return;
    // Send exactly the rows this preview showed, and the fingerprint it was
    // computed from — the server refuses if the sheet has moved since.
    const keys = preview.rows
      .filter((r) => r.kind === "create" || r.kind === "update")
      .map((r) => r.key);
    startTransition(async () => {
      try {
        const r = await applyImportAction(url, keys, preview.fingerprint);
        setApplied(r);
        setPreview(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  const s = preview ? summarize(preview) : null;

  return (
    <div className="mt-6">
      <label htmlFor="sheet-url" className="block text-sm text-zinc-300">
        Published CSV URL
      </label>
      <input
        id="sheet-url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://docs.google.com/spreadsheets/d/e/…/pub?output=csv"
        className="mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-white outline-none focus:border-brand-red"
      />
      <p className="mt-1 text-xs text-muted">
        In Sheets: File → Share → Publish to web → pick the tab → CSV → Publish.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runPreview}
          disabled={!url.trim() || pending}
          className="min-h-[44px] rounded-md border border-brand-red bg-brand-red/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-red/20 disabled:opacity-40"
        >
          {pending ? "Reading sheet…" : "Preview changes"}
        </button>
        {lastImportedAt && !preview && !applied && (
          <span className="text-sm text-muted">
            Last import {lastImportedAt.slice(0, 10)}
            {lastResult
              ? ` · ${lastResult.created} created, ${lastResult.updated} updated`
              : ""}
          </span>
        )}
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-brand-red/40 bg-brand-red/10 p-4">
          <p className="font-semibold text-white">Could not read the sheet</p>
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-sm text-zinc-300">
            {error}
          </pre>
          <p className="mt-2 text-xs text-muted">
            Most often this means the sheet is not published to the web, or the
            URL is the /edit link rather than the published CSV one.
          </p>
        </div>
      )}

      {applied && (
        <p className="mt-6 rounded-lg border border-border bg-surface p-4 text-zinc-200">
          Imported — {applied.created} created, {applied.updated} updated.
        </p>
      )}

      {preview && s && (
        <div className="mt-6">
          <div className="flex flex-wrap gap-3">
            <Tally label="new" value={s.create} tone="action" />
            <Tally label="changed" value={s.update} tone="action" />
            <Tally label="unchanged" value={s.unchanged} />
            <Tally label="conflicts" value={s.conflict} tone={s.conflict ? "warn" : "muted"} />
            <Tally label="errors" value={s.errors} tone={s.errors ? "warn" : "muted"} />
          </div>

          <p className="mt-3 text-sm text-muted">
            {preview.rowsRead} rows read. Nothing has been written yet.
          </p>

          <ul className="mt-4 flex flex-col gap-2">
            {preview.rows
              .filter((r) => r.kind !== "unchanged")
              .map((r) => (
                <RowCard key={`${r.kind}-${r.row}-${r.key}`} row={r} />
              ))}
          </ul>

          {preview.errors.length > 0 && (
            <div className="mt-4 rounded-lg border border-border bg-surface p-4">
              <p className="text-sm font-semibold text-white">
                Rows skipped by validation
              </p>
              <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                {preview.errors.map((e, i) => (
                  <li key={i} className="text-zinc-300">
                    <span className="font-mono text-xs text-muted">
                      row {e.row}
                    </span>{" "}
                    {e.name ? `${e.name} — ` : ""}
                    {e.issue.replace(/\n/g, " ")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={apply}
              disabled={pending || s.applicable === 0}
              className="min-h-[44px] rounded-md border border-brand-red bg-brand-red/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-red/20 disabled:opacity-40"
            >
              {s.applicable === 0
                ? "Nothing to apply"
                : `Apply ${s.applicable} change${s.applicable === 1 ? "" : "s"}`}
            </button>
            <button
              type="button"
              onClick={() => setPreview(null)}
              disabled={pending}
              className="min-h-[44px] rounded-md border border-border bg-surface-2 px-4 py-2 text-sm text-white transition-colors hover:border-brand-red"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Tally({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: number;
  tone?: "action" | "warn" | "muted";
}) {
  const color =
    tone === "action" && value > 0
      ? "border-brand-red text-white"
      : tone === "warn" && value > 0
        ? "border-yellow-600/60 text-yellow-200"
        : "border-border text-zinc-400";
  return (
    <div className={`rounded-lg border ${color} bg-surface px-4 py-2`}>
      <span className="text-xl font-semibold">{value}</span>{" "}
      <span className="text-xs">{label}</span>
    </div>
  );
}

function RowCard({ row }: { row: ImportRow }) {
  if (row.kind === "create") {
    const f = row.fields;
    return (
      <li className="rounded-lg border border-border bg-surface p-3">
        <p className="text-sm">
          <Badge tone="new">new</Badge>
          <span className="font-medium text-white">{f.name}</span>{" "}
          <span className="text-muted">
            {f.position} · class of {f.classYear}
            {f.stars != null && ` · ${f.stars}★`}
          </span>
        </p>
      </li>
    );
  }
  if (row.kind === "update") {
    return (
      <li className="rounded-lg border border-border bg-surface p-3">
        <p className="text-sm">
          <Badge tone="changed">changed</Badge>
          <span className="font-medium text-white">{row.name}</span>
        </p>
        <ul className="mt-1.5 flex flex-col gap-0.5 text-xs">
          {row.diffs.map((d) => (
            <li key={d.field} className="text-zinc-300">
              <span className="text-muted">{d.field}:</span>{" "}
              <span className="text-zinc-500 line-through">{d.from}</span>{" "}
              <span aria-hidden>→</span> <span className="text-white">{d.to}</span>
            </li>
          ))}
        </ul>
      </li>
    );
  }
  if (row.kind === "conflict") {
    return (
      <li className="rounded-lg border border-yellow-600/50 bg-surface p-3">
        <p className="text-sm">
          <Badge tone="conflict">skipped</Badge>
          <span className="font-medium text-white">{row.name}</span>{" "}
          <span className="text-yellow-200/80">— {row.reason}</span>
        </p>
      </li>
    );
  }
  return null;
}

function Badge({
  tone,
  children,
}: {
  tone: "new" | "changed" | "conflict";
  children: React.ReactNode;
}) {
  const c =
    tone === "new"
      ? "border-brand-red text-white"
      : tone === "changed"
        ? "border-border text-zinc-200"
        : "border-yellow-600/60 text-yellow-200";
  return (
    <span
      className={`mr-2 inline-flex rounded border ${c} px-1.5 py-0.5 text-[10px] uppercase tracking-wider`}
    >
      {children}
    </span>
  );
}
