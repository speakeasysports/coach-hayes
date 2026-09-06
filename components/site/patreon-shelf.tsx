import Link from "next/link";
import type { ShelfPost } from "@/lib/db/public";
import { SocialIcon } from "@/components/site/social-icon";

/**
 * Cards for posts behind the paywall.
 *
 * Where a card sends you is the whole design. If a preview clip exists on the
 * site the card goes THERE first — the visitor gets something to watch, and the
 * Patreon ask arrives after they have seen the work rather than before. Only a
 * post with no preview cut yet links straight out.
 */
export function PatreonShelf({ posts }: { posts: ShelfPost[] }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((p) => (
        <li key={p.url}>
          <PostCard post={p} />
        </li>
      ))}
    </ul>
  );
}

function PostCard({ post }: { post: ShelfPost }) {
  const shell =
    "group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface text-left transition-colors hover:border-brand-red";

  const body = (
    <>
      <div className="relative aspect-video bg-black">
        {post.thumbnailUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={post.thumbnailUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-2">
            <SocialIcon name="patreon" className="h-8 w-8 text-zinc-600" />
          </div>
        )}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-brand-red px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          <SocialIcon name="patreon" className="h-2.5 w-2.5" />
          Patreon
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-white">
          {post.title}
        </h3>
        {post.teaser && (
          <p className="line-clamp-2 text-sm text-zinc-400">{post.teaser}</p>
        )}
        <p className="mt-auto pt-1 text-xs text-muted">
          {post.previewSlug ? "Watch the preview →" : "Read on Patreon ↗"}
          {post.postedAt && ` · ${post.postedAt}`}
        </p>
      </div>
    </>
  );

  return post.previewSlug ? (
    <Link href={`/film/${post.previewSlug}`} className={shell}>
      {body}
    </Link>
  ) : (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className={shell}
    >
      {body}
    </a>
  );
}
