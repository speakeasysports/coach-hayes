import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { repo } from "@/lib/admin/repo";
import type { PatreonPostId } from "@/lib/admin/contract";
import { PatreonForm } from "../patreon-form";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const post = await repo.getPatreonPost(id as PatreonPostId);
  return { title: post ? post.title : "Patreon post" };
}

export default async function EditPatreonPostPage({ params }: Props) {
  const { id } = await params;
  const post = await repo.getPatreonPost(id as PatreonPostId);
  if (!post) notFound();

  return (
    <section>
      <Link
        href="/admin/patreon"
        className="text-sm text-muted transition-colors hover:text-white"
      >
        ← Patreon shelf
      </Link>
      <header className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          {post.title}
        </h1>
        <a
          href={post.url}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-muted transition-colors hover:text-white"
        >
          Open on Patreon ↗
        </a>
      </header>
      <PatreonForm
        id={post.id}
        url={post.url}
        title={post.title}
        teaser={post.teaser}
        thumbnailUrl={post.thumbnailUrl}
        postedAt={post.postedAt}
        published={post.published}
        previewSlug={post.previewSlug}
      />
    </section>
  );
}
