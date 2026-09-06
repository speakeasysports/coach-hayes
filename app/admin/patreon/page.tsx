import type { Metadata } from "next";
import Link from "next/link";
import { repo } from "@/lib/admin/repo";

export const metadata: Metadata = { title: "Patreon" };

export default async function PatreonAdminPage() {
  const posts = await repo.listPatreonPosts();
  const live = posts.filter((p) => p.published).length;

  return (
    <section>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Patreon shelf
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Links to your Patreon posts, shown on the homepage and on{" "}
            <Link href="/patreon" className="underline hover:text-white">
              /patreon
            </Link>
            . Patreon will not let a website read its posts, so the title and
            teaser are yours to write.
          </p>
          <p className="mt-1 text-sm text-muted">
            {posts.length} on the shelf · {live} live
          </p>
        </div>
        <Link
          href="/admin/patreon/new"
          className="min-h-[44px] shrink-0 rounded-md border border-brand-red bg-brand-red/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-red/20"
        >
          Add a post
        </Link>
      </header>

      {posts.length === 0 ? (
        <p className="mt-8 rounded-lg border border-border bg-surface p-8 text-center text-sm text-zinc-400">
          Nothing here yet. Add a Patreon post and it appears on the site.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {posts.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/patreon/${p.id}`}
                className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-5 py-4 transition-colors hover:border-brand-red"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-white">
                    {p.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {p.postedAt ?? "no date"}
                    {p.previewSlug
                      ? " · preview clip on site"
                      : " · links straight to Patreon"}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${
                    p.published
                      ? "border-brand-red bg-brand-red/10 font-medium text-white"
                      : "border-border text-muted"
                  }`}
                >
                  {p.published ? "live" : "draft"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
