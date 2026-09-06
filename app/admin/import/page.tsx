import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/admin/session";
import { repo } from "@/lib/admin/repo";
import { ImportClient } from "./import-client";

export const metadata: Metadata = { title: "Big Board" };
export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireSession();
  const source = await repo.getImportSource();

  return (
    <section>
      <h1 className="text-3xl font-bold tracking-tight">Big Board</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        The recruits on{" "}
        <Link href="/big-board" className="underline hover:text-white">
          /big-board
        </Link>
        . They come from a Google Sheet rather than a roster, because a recruit
        is not on one yet — draft the board in Sheets, then pull it in here. The
        database stays the source of truth, so your admin edits survive and the
        board does not empty out if the sheet URL breaks.
      </p>

      <ImportClient
        url={source.url}
        lastImportedAt={source.lastImportedAt}
        lastResult={source.lastResult}
      />
    </section>
  );
}
