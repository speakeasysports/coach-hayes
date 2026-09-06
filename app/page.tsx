import Image from "next/image";
import Link from "next/link";
import { PATREON_URL } from "@/lib/links";
import { SocialIcon } from "@/components/site/social-icon";
import { Suspense } from "react";
import {
  LatestVideos,
  LatestVideosSkeleton,
} from "@/components/site/latest-videos";

export default function Home() {
  return (
    <>
      <Hero />
      <Suspense fallback={<LatestVideosSkeleton />}>
        <LatestVideos />
      </Suspense>
      <FeatureCards />
      <SupportCta />
    </>
  );
}

function Hero() {
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
            Connecting fans to the{" "}
            <span className="text-brand-red">fundamentals</span> of football.
          </h1>
          <p className="max-w-xl text-pretty text-lg text-zinc-300">
            X’s &amp; O’s from a coach’s perspective. Player breakdowns, recruit
            evaluations, and weekly college football film breakdowns.
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
              Watch the breakdowns →
            </Link>
            <Link
              href="/players"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-5 py-3 text-base font-semibold text-white transition-colors hover:border-brand-red"
            >
              Browse players
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

const CARDS: Card[] = [
  {
    href: "/big-board",
    eyebrow: "Recruits",
    title: "Big Board",
    body:
      "Every recruit by position with a film breakdown. Filter by status, class year, or position group.",
    cta: "Browse the board",
  },
  {
    href: "/playbook",
    eyebrow: "Game film",
    title: "Weekly Playbook",
    body:
      "Georgia's installs, week by week. Plays grouped by formation, each one linked to a film breakdown.",
    cta: "Open the playbook",
  },
  {
    href: "https://www.youtube.com/@CoachHayesHudl",
    external: true,
    eyebrow: "Watch",
    title: "Latest video & podcast",
    body:
      "New breakdowns weekly on YouTube, plus the podcast on Spotify and Apple. Subscribe so you don't miss the install.",
    cta: "Open the channel",
  },
];

function FeatureCards() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <div className="grid gap-6 md:grid-cols-3">
        {CARDS.map((c) => {
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

function SupportCta() {
  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-14 text-center sm:px-6">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-red">
          Go deeper
        </span>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          The full install, on Patreon
        </h2>
        <p className="max-w-lg text-pretty text-sm leading-relaxed text-zinc-400">
          Everything on this site stays free. The deeper installs and the
          play-by-play film studies — the ones that take a whole evening to cut
          — live on Patreon.
        </p>
        <a
          href={PATREON_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-2 rounded-md bg-brand-red px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-red-hover"
        >
          <SocialIcon name="patreon" className="h-5 w-5" />
          Support on Patreon
        </a>
      </div>
    </section>
  );
}
