import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/admin/session";
import { repo } from "@/lib/admin/repo";
import { ConceptForm } from "../concept-form";

export const metadata: Metadata = { title: "Concept" };
export const dynamic = "force-dynamic";

export default async function EditConceptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const c = await repo.getConcept(id as never);
  if (!c) notFound();

  return (
    <section>
      <Link
        href="/admin/concepts"
        className="text-sm text-muted transition-colors hover:text-white"
      >
        ← Concepts
      </Link>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{c.label}</h1>
        {c.filmCount > 0 && (
          <a
            href={`/playbook/${c.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted transition-colors hover:text-white"
          >
            View page ↗
          </a>
        )}
      </div>
      <ConceptForm
        id={String(c.id)}
        slug={c.slug}
        label={c.label}
        family={c.family}
        matchPatterns={c.matchPatterns}
        explainer={c.explainer}
        filmCount={c.filmCount}
      />
    </section>
  );
}
