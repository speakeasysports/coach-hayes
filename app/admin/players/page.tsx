import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/admin/session";
import { repo } from "@/lib/admin/repo";

export const metadata: Metadata = { title: "Players" };
export const dynamic = "force-dynamic";

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string; q?: string }>;
}) {
  await requireSession();
  const sp = await searchParams;
  const showAll = sp.all === "1";

  const players = await repo.getPlayers({
    hasVideos: !showAll,
    search: sp.q,
  });

  return (
    <section>
      <h1 className="text-3xl font-bold tracking-tight">Players</h1>
      <p className="mt-2 text-sm text-muted">
        Seeded from the CFBD roster. Players with no linked video cannot be
        published — thin pages hurt search.
      </p>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-border pb-4">
        <Toggle href="/admin/players" active={!showAll}>
          Has videos
        </Toggle>
        <Toggle href="/admin/players?all=1" active={showAll}>
          All roster
        </Toggle>
      </div>

      {players.length === 0 ? (
        <p className="mt-8 rounded-lg border border-border bg-surface p-6 text-zinc-300">
          No players match.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Pos</th>
                <th className="pb-2 pr-4 font-medium">Videos</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 font-medium">Board</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-2.5 pr-4">
                    <Link
                      href={`/admin/player/${p.id}`}
                      className="text-white transition-colors hover:text-brand-red"
                    >
                      {p.name}
                    </Link>
                    {!p.isPublishable && (
                      <span className="ml-2 text-xs text-zinc-600">
                        not publishable
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-zinc-300">{p.position}</td>
                  <td className="py-2.5 pr-4 text-zinc-300">{p.videoCount}</td>
                  <td className="py-2.5 pr-4 text-zinc-300">{p.status}</td>
                  <td className="py-2.5 text-zinc-300">
                    {p.onBigBoard ? "yes" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Toggle({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-[44px] items-center rounded-full border px-4 py-1 text-sm transition-colors ${
        active
          ? "border-brand-red bg-brand-red/10 font-semibold text-white"
          : "border-border bg-surface text-zinc-300 hover:border-brand-red hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}
