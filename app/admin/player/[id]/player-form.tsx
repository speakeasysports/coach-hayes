"use client";

import { useState, useTransition } from "react";
import { PLAYER_STATUSES, type PlayerStatus } from "@/lib/schema";
import { savePlayerAction } from "../../actions";

export function PlayerForm({
  id,
  status,
  onBigBoard,
  aliases,
  bio,
}: {
  id: string;
  status: PlayerStatus;
  onBigBoard: boolean;
  aliases: string[];
  bio: string | null;
}) {
  const [s, setS] = useState<PlayerStatus>(status);
  const [board, setBoard] = useState(onBigBoard);
  const [alias, setAlias] = useState(aliases.join(", "));
  const [b, setB] = useState(bio ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setSaved(false);
    startTransition(async () => {
      await savePlayerAction(id, {
        status: s,
        onBigBoard: board,
        aliases: alias
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        bio: b.trim() || null,
      });
      setSaved(true);
    });
  };

  return (
    <div className="mt-6 rounded-lg border border-border bg-surface p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
        Editorial
      </h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="status" className="block text-sm text-zinc-300">
            Status
          </label>
          <select
            id="status"
            value={s}
            onChange={(e) => setS(e.target.value as PlayerStatus)}
            className="mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-white outline-none focus:border-brand-red"
          >
            {PLAYER_STATUSES.map((v) => (
              <option key={v} value={v}>
                {v.replace(/-/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={board}
              onChange={(e) => setBoard(e.target.checked)}
              className="h-5 w-5 accent-red-600"
            />
            Show on Big Board
          </label>
        </div>
      </div>

      <label htmlFor="aliases" className="mt-4 block text-sm text-zinc-300">
        Aliases
      </label>
      <input
        id="aliases"
        value={alias}
        onChange={(e) => setAlias(e.target.value)}
        placeholder="C Beck, Beck"
        className="mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-white outline-none focus:border-brand-red"
      />
      <p className="mt-1 text-xs text-muted">
        Comma-separated. Every alias permanently improves auto-tagging — this is
        the highest-leverage field on the page.
      </p>

      <label htmlFor="bio" className="mt-4 block text-sm text-zinc-300">
        Coach&rsquo;s take (markdown)
      </label>
      <textarea
        id="bio"
        value={b}
        onChange={(e) => setB(e.target.value)}
        rows={5}
        className="mt-1 w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-white outline-none focus:border-brand-red"
      />

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="min-h-[44px] rounded-md border border-brand-red bg-brand-red/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-red/20 disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-sm text-muted">Saved.</span>}
      </div>
    </div>
  );
}
