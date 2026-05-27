import type { Metadata } from "next";
import { revalidatePath, updateTag } from "next/cache";
import { BOARD_REVALIDATE_TAG, getBoardDiagnostics } from "@/lib/board";

export const metadata: Metadata = {
  title: "Big Board admin",
  robots: { index: false, follow: false },
};

// Force this page to re-render on every visit so the diagnostics reflect
// the freshest fetch (which itself respects the 5min sheet cache + tag).
export const dynamic = "force-dynamic";

async function refreshAction() {
  "use server";
  // Next.js 16: updateTag is the server-action-only successor to
  // single-arg revalidateTag, and triggers immediate invalidation.
  updateTag(BOARD_REVALIDATE_TAG);
  revalidatePath("/big-board");
  revalidatePath("/admin/refresh");
}

export default async function AdminRefreshPage() {
  const sheetEditUrl = process.env.SHEET_EDIT_URL;

  const { recruits, errors } = await getBoardDiagnostics();
  const recruitCount = recruits.length;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-red">
          Admin
        </span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Big Board
        </h1>
        <p className="mt-3 text-zinc-400">
          The Big Board reads from a Google Sheet. Edit the sheet, then either
          wait ~5 minutes or refresh here to publish your changes immediately.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-6">
        {sheetEditUrl && (
          <a
            href={sheetEditUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-md border border-border bg-surface-2 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-brand-red"
          >
            Open the Google Sheet ↗
          </a>
        )}
        <form action={refreshAction}>
          <button
            type="submit"
            className="inline-flex items-center rounded-md border border-brand-red bg-brand-red/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-red/20"
          >
            Refresh now
          </button>
        </form>
      </div>

      <p className="mt-6 text-zinc-300">
        <strong className="text-white">{recruitCount}</strong>{" "}
        {recruitCount === 1 ? "recruit" : "recruits"} currently published.
      </p>

      {errors.length > 0 && (
        <div className="mt-6 rounded-lg border border-border bg-surface p-5">
          <h2 className="text-base font-semibold text-white">
            {errors.length} issue{errors.length === 1 ? "" : "s"} to review
          </h2>
          <p className="mt-1 text-sm text-muted">
            Setup errors and rows with `row 0` are sheet-wide problems; others
            are per-row issues (the row is either skipped or rendered without
            its video).
          </p>
          <ul className="mt-4 flex flex-col gap-3 text-sm">
            {errors.map((e, i) => (
              <li
                key={i}
                className="rounded border border-border bg-surface-2 p-3"
              >
                <p className="font-mono text-xs text-muted">
                  {e.row === 0 ? "setup" : `row ${e.row}`}
                  {e.name && (
                    <span className="ml-2 text-zinc-300">{e.name}</span>
                  )}
                </p>
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-zinc-300">
                  {e.issue}
                </pre>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
