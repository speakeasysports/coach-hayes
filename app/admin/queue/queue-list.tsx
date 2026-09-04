"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type {
  ConceptOption,
  PlayerOption,
  QueueBucket,
  QueueItem,
  SeriesOption,
} from "@/lib/admin/contract";
import {
  archiveVideosAction,
  confirmVideoAction,
  saveTagsAction,
} from "../actions";

type Props = {
  bucket: QueueBucket;
  items: QueueItem[];
  allPlayers: PlayerOption[];
  allConcepts: ConceptOption[];
  allSeries: SeriesOption[];
};

/** Local editable copy of one row's tags. */
type Draft = { playerIds: string[]; conceptIds: string[] };

export function QueueList({
  bucket,
  items,
  allPlayers,
  allConcepts,
  allSeries,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [done, setDone] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const visible = items.filter((i) => !done.has(i.id));

  const draftFor = useCallback(
    (item: QueueItem): Draft =>
      drafts[item.id] ?? {
        playerIds: item.players.map((p) => String(p.playerId)),
        conceptIds: item.concepts.map((c) => String(c.conceptId)),
      },
    [drafts],
  );

  const setDraft = (id: string, next: Draft) =>
    setDrafts((d) => ({ ...d, [id]: next }));

  const confirm = useCallback(
    (item: QueueItem) => {
      const d = drafts[item.id];
      setDone((s) => new Set(s).add(item.id));
      startTransition(async () => {
        if (d) {
          await saveTagsAction(item.id, {
            playerIds: d.playerIds as never,
            conceptIds: d.conceptIds as never,
            topics: item.topics,
            seriesId: (item.series?.seriesId ?? null) as never,
            positionGroupsOverride: [],
          });
        } else {
          await confirmVideoAction(item.id);
        }
      });
    },
    [drafts],
  );

  const archiveSelected = () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setDone((s) => new Set([...s, ...ids]));
    setSelected(new Set());
    startTransition(async () => {
      await archiveVideosAction(ids);
    });
  };

  // Keyboard: j/k move, Enter confirms. At ~38 items this is the difference
  // between a chore and two minutes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === "j") setFocus((f) => Math.min(f + 1, visible.length - 1));
      else if (e.key === "k") setFocus((f) => Math.max(f - 1, 0));
      else if (e.key === "Enter" && visible[focus]) {
        e.preventDefault();
        confirm(visible[focus]);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, focus, confirm]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  if (visible.length === 0) {
    return (
      <p className="mt-8 rounded-lg border border-border bg-surface p-6 text-zinc-300">
        Bucket cleared. Nice.
      </p>
    );
  }

  return (
    <div className="mt-6">
      {bucket === "unmatched" && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setSelected(
                selected.size === visible.length
                  ? new Set()
                  : new Set(visible.map((i) => i.id)),
              )
            }
            className="min-h-[44px] rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-white transition-colors hover:border-brand-red"
          >
            {selected.size === visible.length ? "Clear selection" : "Select all"}
          </button>
          <button
            type="button"
            onClick={archiveSelected}
            disabled={selected.size === 0 || pending}
            className="min-h-[44px] rounded-md border border-brand-red bg-brand-red/10 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-red/20 disabled:opacity-40"
          >
            Archive selected ({selected.size})
          </button>
          <span className="text-xs text-muted">
            Archiving keeps the row and its tags — nothing is deleted.
          </span>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {visible.map((item, i) => (
          <QueueRow
            key={item.id}
            item={item}
            focused={i === focus}
            selectable={bucket === "unmatched"}
            selected={selected.has(item.id)}
            onSelect={() => toggle(item.id)}
            onFocus={() => setFocus(i)}
            draft={draftFor(item)}
            onDraft={(d) => setDraft(item.id, d)}
            onConfirm={() => confirm(item)}
            allPlayers={allPlayers}
            allConcepts={allConcepts}
            allSeries={allSeries}
            pending={pending}
          />
        ))}
      </ul>

      <p className="mt-6 text-xs text-muted">
        <kbd className="rounded border border-border px-1">j</kbd>{" "}
        <kbd className="rounded border border-border px-1">k</kbd> move ·{" "}
        <kbd className="rounded border border-border px-1">↵</kbd> confirm
      </p>
    </div>
  );
}

function QueueRow({
  item,
  focused,
  selectable,
  selected,
  onSelect,
  onFocus,
  draft,
  onDraft,
  onConfirm,
  allPlayers,
  allConcepts,
  pending,
}: {
  item: QueueItem;
  focused: boolean;
  selectable: boolean;
  selected: boolean;
  onSelect: () => void;
  onFocus: () => void;
  draft: Draft;
  onDraft: (d: Draft) => void;
  onConfirm: () => void;
  allPlayers: PlayerOption[];
  allConcepts: ConceptOption[];
  allSeries: SeriesOption[];
  pending: boolean;
}) {
  const playerName = (id: string) =>
    allPlayers.find((p) => String(p.id) === id)?.name ?? id;
  const conceptLabel = (id: string) =>
    allConcepts.find((c) => String(c.id) === id)?.label ?? id;

  return (
    <li
      onMouseEnter={onFocus}
      className={`rounded-lg border bg-surface p-4 transition-colors ${
        focused ? "border-brand-red" : "border-border"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        {selectable && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            aria-label={`Select ${item.title}`}
            className="mt-1 h-5 w-5 shrink-0 accent-red-600"
          />
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.thumbnailUrl}
          alt=""
          loading="lazy"
          className="h-20 w-36 shrink-0 rounded border border-border object-cover"
        />

        <div className="min-w-0 flex-1">
          <p className="font-medium text-white">{item.title}</p>
          <p className="mt-0.5 text-xs text-muted">
            {item.publishedAt.slice(0, 10)} · {item.format}
            {item.tagConfidence > 0 && ` · confidence ${item.tagConfidence}`}
          </p>

          {item.ambiguities.length > 0 ? (
            <Ambiguity
              item={item}
              draft={draft}
              onDraft={onDraft}
            />
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              <ChipRow
                label="players"
                ids={draft.playerIds}
                render={playerName}
                onRemove={(id) =>
                  onDraft({
                    ...draft,
                    playerIds: draft.playerIds.filter((x) => x !== id),
                  })
                }
                options={allPlayers.map((p) => ({
                  value: String(p.id),
                  label: `${p.name} (${p.position})`,
                }))}
                onAdd={(id) =>
                  onDraft({ ...draft, playerIds: [...draft.playerIds, id] })
                }
              />
              <ChipRow
                label="concepts"
                ids={draft.conceptIds}
                render={conceptLabel}
                onRemove={(id) =>
                  onDraft({
                    ...draft,
                    conceptIds: draft.conceptIds.filter((x) => x !== id),
                  })
                }
                options={allConcepts.map((c) => ({
                  value: String(c.id),
                  label: c.label,
                }))}
                onAdd={(id) =>
                  onDraft({ ...draft, conceptIds: [...draft.conceptIds, id] })
                }
              />
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onConfirm}
              disabled={pending}
              className="min-h-[44px] rounded-md border border-brand-red bg-brand-red/10 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-red/20 disabled:opacity-40"
            >
              Confirm
            </button>
            <Link
              href={`/admin/video/${item.id}`}
              className="inline-flex min-h-[44px] items-center rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-white transition-colors hover:border-brand-red"
            >
              Edit
            </Link>
            <a
              href={`https://www.youtube.com/watch?v=${item.youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center px-1 text-sm text-muted transition-colors hover:text-white"
            >
              Watch ↗
            </a>
          </div>
        </div>
      </div>
    </li>
  );
}

function Ambiguity({
  item,
  draft,
  onDraft,
}: {
  item: QueueItem;
  draft: Draft;
  onDraft: (d: Draft) => void;
}) {
  return (
    <div className="mt-3 flex flex-col gap-3">
      {item.ambiguities.map((a) => (
        <fieldset key={a.surname} className="rounded border border-border p-3">
          <legend className="px-1 text-xs text-muted">
            Which &ldquo;{a.surname}&rdquo;?
          </legend>
          <div className="flex flex-col gap-1.5">
            {[...a.candidates]
              .sort((x, y) => Number(y.initialsMatch) - Number(x.initialsMatch))
              .map((c) => {
                const id = String(c.playerId);
                return (
                  <label
                    key={id}
                    className="flex min-h-[32px] cursor-pointer items-center gap-2 text-sm text-zinc-300"
                  >
                    <input
                      type="radio"
                      name={`amb-${item.id}-${a.surname}`}
                      checked={draft.playerIds.includes(id)}
                      onChange={() => onDraft({ ...draft, playerIds: [id] })}
                      className="accent-red-600"
                    />
                    <span className="text-white">{c.name}</span>
                    <span className="text-muted">
                      {c.position} · {c.rosterYears.join(", ")}
                    </span>
                    {c.initialsMatch && (
                      <span className="text-xs text-brand-red">
                        initials match
                      </span>
                    )}
                  </label>
                );
              })}
            <label className="flex min-h-[32px] cursor-pointer items-center gap-2 text-sm text-muted">
              <input
                type="radio"
                name={`amb-${item.id}-${a.surname}`}
                checked={draft.playerIds.length === 0}
                onChange={() => onDraft({ ...draft, playerIds: [] })}
                className="accent-red-600"
              />
              None of these
            </label>
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function ChipRow({
  label,
  ids,
  render,
  onRemove,
  options,
  onAdd,
}: {
  label: string;
  ids: string[];
  render: (id: string) => string;
  onRemove: (id: string) => void;
  options: { value: string; label: string }[];
  onAdd: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs uppercase tracking-wider text-muted">
        {label}
      </span>
      {ids.length === 0 && <span className="text-xs text-zinc-600">none</span>}
      {ids.map((id) => (
        <span
          key={id}
          className="inline-flex items-center gap-1 rounded border border-border bg-surface-2 px-2 py-0.5 text-xs text-zinc-200"
        >
          {render(id)}
          <button
            type="button"
            onClick={() => onRemove(id)}
            aria-label={`Remove ${render(id)}`}
            className="text-muted transition-colors hover:text-brand-red"
          >
            ×
          </button>
        </span>
      ))}
      <select
        value=""
        onChange={(e) => e.target.value && onAdd(e.target.value)}
        aria-label={`Add ${label}`}
        className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-xs text-zinc-300"
      >
        <option value="">+ add</option>
        {options
          .filter((o) => !ids.includes(o.value))
          .map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
      </select>
    </div>
  );
}
