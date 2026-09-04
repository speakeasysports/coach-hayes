import type { Metadata } from "next";
import { requireSession } from "@/lib/admin/session";
import { repo } from "@/lib/admin/repo";
import { ImportClient } from "./import-client";

export const metadata: Metadata = { title: "Import" };
export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireSession();
  const source = await repo.getImportSource();

  return (
    <section>
      <h1 className="text-3xl font-bold tracking-tight">Import from Sheets</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Draft the board in Google Sheets, then pull it in. The database stays
        the source of truth — your admin edits survive, and the board does not
        empty out if the sheet URL breaks.
      </p>

      <ImportClient
        url={source.url}
        lastImportedAt={source.lastImportedAt}
        lastResult={source.lastResult}
      />
    </section>
  );
}
