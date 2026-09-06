import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/admin/session";
import { repo } from "@/lib/admin/repo";
import { CONCEPT_FAMILIES } from "@/lib/schema";

export const metadata: Metadata = { title: "Concepts" };
export const dynamic = "force-dynamic";

export default async function ConceptsPage() {
  await requireSession();
  const concepts = await repo.listConcepts();

  const byFamily = new Map<string, typeof concepts>();
  for (const c of concepts) {
    const arr = byFamily.get(c.family) ?? [];
    arr.push(c);
    byFamily.set(c.family, arr);
  }

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Concepts</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            The schemes your videos get tagged with. Each one with film behind it
            becomes a page in the Playbook.
          </p>
        </div>
        <Link
          href="/admin/concepts/new"
          className="inline-flex min-h-[44px] items-center rounded-md border border-brand-red bg-brand-red/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-red/20"
        >
          Add concept
        </Link>
      </div>

      <div className="mt-8 flex flex-col gap-8">
        {CONCEPT_FAMILIES.map((family) => {
          const rows = byFamily.get(family);
          if (!rows?.length) return null;
          return (
            <section key={family}>
              <h2 className="mb-3 flex items-baseline gap-2 text-sm font-semibold uppercase tracking-wider text-muted">
                <span>{family}</span>
                <span className="text-zinc-600">{rows.length}</span>
              </h2>
              <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
                {rows.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/admin/concepts/${c.id}`}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-surface-2"
                    >
                      <span className="font-medium text-white">{c.label}</span>
                      <span className="text-xs text-muted">
                        {c.filmCount > 0
                          ? `${c.filmCount} ${c.filmCount === 1 ? "video" : "videos"}`
                          : "no film yet"}
                      </span>
                      <span className="text-xs text-zinc-600">
                        {c.patternCount}{" "}
                        {c.patternCount === 1 ? "match word" : "match words"}
                      </span>
                      {c.hasExplainer && (
                        <span className="text-xs text-zinc-600">described</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </section>
  );
}
