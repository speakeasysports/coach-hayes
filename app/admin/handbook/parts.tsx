import Link from "next/link";

/**
 * Handbook furniture. The published artifact version of this document is a
 * light editorial page; this one lives inside the dark admin shell, so it
 * borrows the admin's own tokens rather than carrying a second palette.
 */

export function Step({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={`step-${n}`} className="scroll-mt-24 border-t border-border pt-10">
      <div className="flex items-baseline gap-4">
        <span className="text-3xl font-bold leading-none text-brand-red tabular-nums">
          {n}
        </span>
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          {title}
        </h2>
      </div>
      <div className="mt-5 flex max-w-2xl flex-col gap-4 text-[15px] leading-relaxed text-zinc-300">
        {children}
      </div>
    </section>
  );
}

export function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
      {children}
    </h3>
  );
}

export function Note({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <aside className="rounded-lg border border-border border-t-2 border-t-brand-red bg-surface p-4">
      <span className="block text-[11px] font-semibold uppercase tracking-widest text-brand-red">
        {label}
      </span>
      <div className="mt-2 flex flex-col gap-3 text-sm text-zinc-300">
        {children}
      </div>
    </aside>
  );
}

/**
 * Screenshots are real files under /public/handbook rather than inlined, so
 * the page stays light and the browser can cache them between visits.
 */
export function Shot({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return (
    <figure className="my-2 max-w-4xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/handbook/${src}.jpg`}
        alt={alt}
        loading="lazy"
        className="w-full rounded-lg border border-border"
      />
      <figcaption className="mt-2 text-xs leading-relaxed text-muted">
        {caption}
      </figcaption>
    </figure>
  );
}

export function Btn({ children }: { children: React.ReactNode }) {
  return (
    <span className="whitespace-nowrap rounded border border-zinc-500 px-1.5 py-0.5 text-[0.85em] font-semibold text-white">
      {children}
    </span>
  );
}

export function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em] text-zinc-200">
      {children}
    </code>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border border-b-2 bg-surface px-1.5 py-0.5 font-mono text-[0.8em] text-zinc-200">
      {children}
    </kbd>
  );
}

export function KV({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="font-mono text-xs text-muted sm:pt-1">{k}</dt>
          <dd className="mb-2 text-zinc-300 sm:mb-0">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-zinc-600">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

export function Contents({ steps }: { steps: Array<[string, string]> }) {
  return (
    <nav
      aria-label="Contents"
      className="rounded-lg border border-border bg-surface p-5"
    >
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
        Contents
      </span>
      <ol className="mt-3 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
        {steps.map(([n, title]) => (
          <li key={n}>
            <Link
              href={`#step-${n}`}
              className="flex gap-3 text-sm text-zinc-300 transition-colors hover:text-white"
            >
              <span className="font-mono text-xs text-muted">{n}</span>
              {title}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
