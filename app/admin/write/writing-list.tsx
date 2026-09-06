"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { WritingItem } from "@/lib/admin/contract";
import { saveWritingAction } from "../actions";

type Tab = "concepts" | "players";

export function WritingList({
  concepts,
  players,
}: {
  concepts: WritingItem[];
  players: WritingItem[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("concepts");
  const [showDone, setShowDone] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const items = tab === "concepts" ? concepts : players;
  const key = (i: WritingItem) => `${i.kind}:${i.id}`;

  const visible = useMemo(
    () => (showDone ? items : items.filter((i) => i.text == null)),
    [items, showDone],
  );

  // Only what actually changed goes to the server; an untouched field must not
  // be rewritten with its own value and bump nothing.
  const dirty = useMemo(
    () =>
      [...concepts, ...players].filter((i) => {
        const d = draft[key(i)];
        return d !== undefined && d !== (i.text ?? "");
      }),
    [concepts, players, draft],
  );

  const save = () => {
    setError(null);
    setSavedCount(null);
    startTransition(async () => {
      const res = await saveWritingAction(
        dirty.map((i) => ({ kind: i.kind, id: i.id, text: draft[key(i)] ?? "" })),
      );
      if (res.error) setError(res.error);
      else {
        setSavedCount(res.saved);
        setDraft({});
        router.refresh();
      }
    });
  };

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Tabs tab={tab} setTab={setTab} concepts={concepts} players={players} />
        <label className="ml-auto flex items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={showDone}
            onChange={(e) => setShowDone(e.target.checked)}
            className="h-4 w-4"
          />
          Show the ones already written
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-zinc-400">
          Every {tab === "concepts" ? "concept" : "player"} has text. Tick the
          box above to edit what is there.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((item) => (
            <Row
              key={key(item)}
              item={item}
              value={draft[key(item)] ?? item.text ?? ""}
              onChange={(v) => {
                setSavedCount(null);
                setDraft((p) => ({ ...p, [key(item)]: v }));
              }}
            />
          ))}
        </ul>
      )}

      {error && (
        <p className="rounded-md border border-brand-red bg-brand-red/10 px-4 py-3 text-sm text-white">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-border bg-black/90 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <button
          type="button"
          onClick={save}
          disabled={pending || dirty.length === 0}
          className="min-h-[44px] rounded-md bg-brand-red px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-red-hover disabled:opacity-40"
        >
          {pending
            ? "Saving…"
            : dirty.length === 0
              ? "Save"
              : `Save ${dirty.length}`}
        </button>
        {dirty.length > 0 && !pending && (
          <span className="text-sm text-muted">
            {dirty.length} unsaved{" "}
            {dirty.length === 1 ? "change" : "changes"}
            {tab === "concepts" && dirty.some((d) => d.kind === "player")
              ? " (including some on the Players tab)"
              : ""}
            {tab === "players" && dirty.some((d) => d.kind === "concept")
              ? " (including some on the Concepts tab)"
              : ""}
          </span>
        )}
        {savedCount != null && (
          <span className="text-sm text-zinc-400">
            Saved {savedCount}. Live in a few seconds.
          </span>
        )}
      </div>
    </div>
  );
}

function Tabs({
  tab,
  setTab,
  concepts,
  players,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  concepts: WritingItem[];
  players: WritingItem[];
}) {
  const left = concepts.filter((i) => i.text == null).length;
  const leftP = players.filter((i) => i.text == null).length;
  return (
    <>
      <TabButton active={tab === "concepts"} onClick={() => setTab("concepts")}>
        Concepts <Count n={left} total={concepts.length} />
      </TabButton>
      <TabButton active={tab === "players"} onClick={() => setTab("players")}>
        Players <Count n={leftP} total={players.length} />
      </TabButton>
    </>
  );
}

function Count({ n, total }: { n: number; total: number }) {
  return (
    <span className="ml-1.5 text-xs text-muted">
      {n === 0 ? `all ${total} done` : `${n} to write`}
    </span>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[40px] rounded-full border px-4 text-sm transition-colors ${
        active
          ? "border-brand-red bg-brand-red/10 font-semibold text-white"
          : "border-border bg-surface text-zinc-300 hover:border-brand-red hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function Row({
  item,
  value,
  onChange,
}: {
  item: WritingItem;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <li className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="font-semibold text-white">{item.label}</span>
        <span className="text-xs text-muted">
          <span className="capitalize">{item.context}</span> · {item.videoCount}{" "}
          {item.videoCount === 1 ? "video" : "videos"} ·{" "}
          <Link
            href={item.publicHref}
            target="_blank"
            className="underline hover:text-white"
          >
            page ↗
          </Link>
        </span>
      </div>

      {item.examples.length > 0 && (
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          From: {item.examples.join(" · ")}
        </p>
      )}

      <textarea
        value={value}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          item.kind === "concept"
            ? "What the concept is and what it is trying to do. Two or three sentences."
            : "What he does well, what he is working on, why the film is worth watching."
        }
        className="mt-3 min-h-[84px] w-full rounded-md border border-border bg-surface-2 px-3 py-2 leading-relaxed text-white outline-none placeholder:text-zinc-500 focus:border-brand-red"
      />
    </li>
  );
}
