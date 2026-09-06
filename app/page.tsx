import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PATREON_URL } from "@/lib/links";
import { SocialIcon } from "@/components/site/social-icon";
import { Emphasis } from "@/components/site/emphasis";
import { Suspense } from "react";
import {
  LatestVideos,
  LatestVideosSkeleton,
} from "@/components/site/latest-videos";
import { getCopy } from "@/lib/content/get-copy";
import type { Copy } from "@/lib/content/copy";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { description: copy["home.meta.description"] };
}

export default async function Home() {
  const copy = await getCopy();
  return (
    <>
      <Hero copy={copy} />
      <Suspense fallback={<LatestVideosSkeleton />}>
        <LatestVideos copy={copy} />
      </Suspense>
      <FeatureCards copy={copy} />
      <SupportCta copy={copy} />
    </>
  );
}

function Hero({ copy }: { copy: Copy }) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(252,10,14,0.15),transparent_60%)]"
      />
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-12 text-center sm:gap-10 sm:py-16 sm:px-6 md:flex-row md:gap-14 md:py-28 md:text-left">
        <div className="shrink-0">
          <Image
            src="/logo.png"
            alt="Coach Hayes Hudl"
            width={220}
            height={220}
            priority
            className="h-28 w-28 rounded-lg object-contain sm:h-40 sm:w-40 md:h-56 md:w-56"
          />
        </div>
        <div className="flex flex-col items-center gap-6 md:items-start">
          <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            <Emphasis text={copy["home.hero.headline"]} />
          </h1>
          <p className="max-w-xl text-pretty text-lg text-zinc-300">
            {copy["home.hero.subhead"]}
          </p>
          {/*
            Audience first, then Patreon. The hero used to lead with the money
            ask and follow it with the Big Board — which is empty until Coach
            imports a sheet, so a first-time visitor's two most prominent
            choices were "pay me" and "come back later". The film room is the
            thing worth showing first; the nav already carries a Patreon button
            for anyone who has decided.
          */}
          <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <Link
              href="/film"
              className="inline-flex items-center gap-2 rounded-md bg-brand-red px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-red-hover"
            >
              {copy["home.hero.primaryCta"]}
            </Link>
            <Link
              href="/players"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-5 py-3 text-base font-semibold text-white transition-colors hover:border-brand-red"
            >
              {copy["home.hero.secondaryCta"]}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

type Card = {
  href: string;
  external?: boolean;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
};

/** Where each card points. The words are editable; the destinations are not. */
const CARD_LINKS = [
  { id: "board", href: "/big-board" },
  { id: "playbook", href: "/playbook" },
  { id: "channel", href: "https://www.youtube.com/@CoachHayesHudl", external: true },
] as const;

function cards(copy: Copy): Card[] {
  return CARD_LINKS.map((link) => ({
    href: link.href,
    external: "external" in link ? link.external : undefined,
    eyebrow: copy[`home.cards.${link.id}.eyebrow` as keyof Copy],
    title: copy[`home.cards.${link.id}.title` as keyof Copy],
    body: copy[`home.cards.${link.id}.body` as keyof Copy],
    cta: copy[`home.cards.${link.id}.cta` as keyof Copy],
  }));
}

function FeatureCards({ copy }: { copy: Copy }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <div className="grid gap-6 md:grid-cols-3">
        {cards(copy).map((c) => {
          const inner = (
            <>
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-red">
                {c.eyebrow}
              </span>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                {c.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                {c.body}
              </p>
              <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-white">
                {c.cta}
                <span aria-hidden>→</span>
              </span>
            </>
          );
          const className =
            "group flex flex-col rounded-xl border border-border bg-surface p-6 transition-colors hover:border-brand-red";
          return c.external ? (
            <a
              key={c.title}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
            >
              {inner}
            </a>
          ) : (
            <Link key={c.title} href={c.href} className={className}>
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function SupportCta({ copy }: { copy: Copy }) {
  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-14 text-center sm:px-6">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-red">
          {copy["home.support.eyebrow"]}
        </span>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {copy["home.support.heading"]}
        </h2>
        <p className="max-w-lg text-pretty text-sm leading-relaxed text-zinc-400">
          {copy["home.support.body"]}
        </p>
        <a
          href={PATREON_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-2 rounded-md bg-brand-red px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-red-hover"
        >
          <SocialIcon name="patreon" className="h-5 w-5" />
          {copy["home.support.cta"]}
        </a>
      </div>
    </section>
  );
}
