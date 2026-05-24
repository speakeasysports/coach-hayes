import Link from "next/link";

type Props = {
  eyebrow: string;
  title: string;
  body: string;
  phase: string;
};

export function ComingSoon({ eyebrow, title, body, phase }: Props) {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-5 px-4 py-24 text-center sm:px-6">
      <span className="text-xs font-semibold uppercase tracking-wider text-brand-red">
        {eyebrow}
      </span>
      <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
        {title}
      </h1>
      <p className="max-w-xl text-pretty text-base text-zinc-400">{body}</p>
      <p className="text-sm font-semibold text-zinc-500">{phase}</p>
      <Link
        href="/"
        className="mt-2 inline-flex items-center gap-2 rounded-md border border-border bg-surface px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-brand-red"
      >
        ← Back home
      </Link>
    </section>
  );
}
