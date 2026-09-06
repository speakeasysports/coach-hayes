import Link from "next/link";

/**
 * A jump bar for the long grouped indexes. /film renders 73 cards, /players 53
 * and /playbook 39, each grouped but each a single uninterrupted scroll — so
 * the grouping was invisible unless you scrolled past it.
 *
 * Deliberately anchor links rather than URL-param filters: /players, /film and
 * /playbook are statically generated, and reading searchParams would turn the
 * three biggest SEO surfaces on the site dynamic. Anchors keep them static and
 * still answer "take me to the linebackers".
 */
export type Section = { id: string; label: string; count: number };

export function SectionNav({ sections }: { sections: Section[] }) {
  if (sections.length < 2) return null;
  return (
    <nav
      aria-label="Jump to section"
      className="sticky top-16 z-40 -mx-4 mb-8 border-y border-border bg-black/85 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6"
    >
      <ul className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map((s) => (
          <li key={s.id} className="snap-start">
            <Link
              href={`#${s.id}`}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-surface px-3 py-1 text-sm capitalize text-zinc-300 transition-colors hover:border-brand-red hover:text-white"
            >
              {s.label}
              <span className="text-zinc-500">{s.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Anchor target that clears the sticky header and the jump bar above it. */
export const SECTION_ANCHOR = "scroll-mt-32";

/** Group labels become ids; keep it deterministic and URL-safe. */
export function sectionId(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
