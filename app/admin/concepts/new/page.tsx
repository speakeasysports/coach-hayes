import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/admin/session";
import { ConceptForm } from "../concept-form";

export const metadata: Metadata = { title: "Add concept" };

export default async function NewConceptPage() {
  await requireSession();
  return (
    <section>
      <Link
        href="/admin/concepts"
        className="text-sm text-muted transition-colors hover:text-white"
      >
        ← Concepts
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Add a concept</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Its web address is set from the name when you save, and stays fixed after
        that.
      </p>
      <ConceptForm
        id={null}
        slug={null}
        label=""
        family="run game"
        matchPatterns={[]}
        explainer={null}
        filmCount={0}
      />
    </section>
  );
}
