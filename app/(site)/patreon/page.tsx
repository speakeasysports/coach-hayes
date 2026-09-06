import type { Metadata } from "next";
import Link from "next/link";
import { getPatreonShelf } from "@/lib/db/public";
import { getCopy } from "@/lib/content/get-copy";
import { PatreonShelf } from "@/components/site/patreon-shelf";
import { SocialIcon } from "@/components/site/social-icon";
import { PATREON_URL } from "@/lib/links";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return {
    title: "On Patreon",
    description: copy["patreon.meta.description"],
    alternates: { canonical: "/patreon" },
  };
}

export default async function PatreonIndexPage() {
  const [posts, copy] = await Promise.all([getPatreonShelf(), getCopy()]);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-red">
          {copy["patreon.eyebrow"]}
        </span>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
          {copy["patreon.heading"]}
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          {copy["patreon.intro"]}
          {posts.length > 0 && (
            <span className="text-zinc-500">
              {" "}
              {posts.length} {posts.length === 1 ? "study" : "studies"}
            </span>
          )}
        </p>
      </header>

      {posts.length > 0 ? (
        <PatreonShelf posts={posts} />
      ) : (
        <p className="rounded-xl border border-border bg-surface p-8 text-center text-zinc-400">
          {copy["patreon.empty"]}
        </p>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3 border-t border-border pt-8">
        <a
          href={PATREON_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-brand-red px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-red-hover"
        >
          <SocialIcon name="patreon" className="h-5 w-5" />
          {copy["patreon.cta"]}
        </a>
        <Link
          href="/film"
          className="rounded-md border border-border bg-surface px-5 py-3 text-base font-semibold text-white transition-colors hover:border-brand-red"
        >
          Browse the free film
        </Link>
      </div>
    </section>
  );
}
