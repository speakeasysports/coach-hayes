import type { Metadata } from "next";
import Link from "next/link";
import { repo } from "@/lib/admin/repo";

export const metadata: Metadata = { title: "Content" };

export default async function ContentIndexPage() {
  const pages = await repo.listPageCopy();
  const totalCustomized = pages.reduce((n, p) => n + p.customized, 0);

  return (
    <section>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Page content
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Headings, paragraphs and button labels on the public pages. Edits go
          live within a few seconds — no deploy. Clear a box to put back the
          wording the site shipped with.
        </p>
        <p className="mt-1 text-sm text-muted">
          {pages.length} pages ·{" "}
          {totalCustomized === 0
            ? "nothing changed yet"
            : `${totalCustomized} ${totalCustomized === 1 ? "field" : "fields"} changed`}
        </p>
      </header>

      <ul className="mt-6 flex flex-col gap-3">
        {pages.map((p) => (
          <li key={p.id}>
            <Link
              href={`/admin/content/${p.id}`}
              className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-5 py-4 transition-colors hover:border-brand-red"
            >
              <span>
                <span className="block font-semibold text-white">{p.label}</span>
                <span className="mt-0.5 block text-xs text-muted">
                  {p.path} · {p.fields.length} editable{" "}
                  {p.fields.length === 1 ? "field" : "fields"}
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted">
                {p.customized > 0 ? (
                  <span className="rounded-full border border-brand-red bg-brand-red/10 px-2.5 py-1 font-medium text-white">
                    {p.customized} changed
                  </span>
                ) : (
                  <span className="rounded-full border border-border px-2.5 py-1">
                    default
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
