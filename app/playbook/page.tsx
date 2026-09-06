import type { Metadata } from "next";
import Link from "next/link";
import { getConceptIndex } from "@/lib/db/public";
import { getThumbnailUrl } from "@/lib/youtube";
import { CONCEPT_FAMILIES } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Playbook",
  description:
    "Every scheme and concept Coach Hayes breaks down on film — run game, pass game, coverage, fronts and technique.",
  alternates: { canonical: "/playbook" },
};

export default async function PlaybookIndexPage() {
  const concepts = await getConceptIndex();

  if (concepts.length === 0) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-5 px-4 py-24 text-center sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight">Playbook</h1>
        <p className="text-zinc-400">Concepts are being indexed. Check back soon.</p>
      </section>
    );
  }

  const byFamily = new Map<string, typeof concepts>();
  for (const c of concepts) {
    const arr = byFamily.get(c.family) ?? [];
    arr.push(c);
    byFamily.set(c.family, arr);
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-red">
          X&rsquo;s &amp; O&rsquo;s
        </span>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Playbook</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Every concept broken down on film, grouped by what it does.{" "}
          <span className="text-zinc-500">{concepts.length} concepts</span>
        </p>
      </header>

      <div className="flex flex-col gap-12">
        {CONCEPT_FAMILIES.map((family) => {
          const rows = byFamily.get(family);
          if (!rows?.length) return null;
          return (
            <section key={family}>
              <h2 className="mb-4 flex items-baseline gap-2 text-2xl font-semibold capitalize tracking-tight">
                <span>{family}</span>
                <span className="text-base font-normal text-muted">{rows.length}</span>
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {rows.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/playbook/${c.slug}`}
                      className="group block overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-brand-red"
                    >
                      <div className="relative aspect-video bg-black">
                        {c.thumbnailId && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={getThumbnailUrl(c.thumbnailId)}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover opacity-75 transition-opacity group-hover:opacity-100"
                          />
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-semibold text-white">{c.label}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {c.filmCount} {c.filmCount === 1 ? "video" : "videos"}
                        </p>
                      </div>
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
