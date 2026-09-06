"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CopyFieldState } from "@/lib/admin/contract";
import { savePageCopyAction } from "../../actions";

type Props = {
  pageId: string;
  path: string;
  fields: CopyFieldState[];
};

export function CopyForm({ pageId, path, fields }: Props) {
  const router = useRouter();
  // An empty string in state means "use the default" — the same thing the
  // repository stores as "no row". The default shows through as placeholder
  // text so the box is never a mystery when it is blank.
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.value ?? ""])),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty = fields.some((f) => (values[f.key] ?? "") !== (f.value ?? ""));

  const set = (key: string, v: string) => {
    setSaved(false);
    setValues((prev) => ({ ...prev, [key]: v }));
  };

  const save = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await savePageCopyAction(pageId, values);
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  const revertAll = () => {
    setSaved(false);
    setValues(Object.fromEntries(fields.map((f) => [f.key, ""])));
  };

  return (
    <div className="mt-6 flex flex-col gap-4">
      {fields.map((f) => (
        <Field key={f.key} field={f} value={values[f.key] ?? ""} onChange={set} />
      ))}

      {error && (
        <p className="rounded-md border border-brand-red bg-brand-red/10 px-4 py-3 text-sm text-white">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-border bg-black/90 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="min-h-[44px] rounded-md bg-brand-red px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-red-hover disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={revertAll}
          disabled={pending}
          className="min-h-[44px] rounded-md border border-border px-4 text-sm text-zinc-300 transition-colors hover:border-brand-red hover:text-white disabled:opacity-40"
        >
          Reset page to defaults
        </button>
        {saved && (
          <span className="text-sm text-zinc-400">
            Saved.{" "}
            <a
              href={path}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-white"
            >
              See it live ↗
            </a>
          </span>
        )}
        {!saved && dirty && (
          <span className="text-sm text-muted">Unsaved changes.</span>
        )}
      </div>
    </div>
  );
}

function Field({
  field,
  value,
  onChange,
}: {
  field: CopyFieldState;
  value: string;
  onChange: (key: string, v: string) => void;
}) {
  const isDefault = value.trim() === "";
  const over = field.maxLength != null && value.length > field.maxLength;

  const shared =
    "mt-1 w-full rounded-md border bg-surface-2 px-3 py-2 text-white outline-none placeholder:text-zinc-500 " +
    (over ? "border-brand-red" : "border-border focus:border-brand-red");

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <label htmlFor={field.key} className="text-sm font-medium text-zinc-200">
          {field.label}
        </label>
        {isDefault ? (
          <span className="text-xs text-muted">Default</span>
        ) : (
          <button
            type="button"
            onClick={() => onChange(field.key, "")}
            className="text-xs text-muted underline transition-colors hover:text-white"
          >
            Reset to default
          </button>
        )}
      </div>

      {field.kind === "paragraph" ? (
        <textarea
          id={field.key}
          value={value}
          rows={3}
          placeholder={field.fallback}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={`${shared} min-h-[88px] leading-relaxed`}
        />
      ) : (
        <input
          id={field.key}
          value={value}
          placeholder={field.fallback}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={`${shared} min-h-[44px]`}
        />
      )}

      <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-xs text-muted">
          {field.help ?? (isDefault ? "Showing the text above." : " ")}
        </p>
        {field.maxLength != null && (
          <p className={`text-xs ${over ? "text-brand-red" : "text-muted"}`}>
            {(value || field.fallback).length}/{field.maxLength}
            {over && " — Google will cut this off"}
          </p>
        )}
      </div>
    </div>
  );
}
