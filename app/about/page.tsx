import type { Metadata } from "next";
import Image from "next/image";
import { SOCIAL_LINKS } from "@/lib/links";
import { SocialIcon } from "@/components/site/social-icon";

export const metadata: Metadata = {
  title: "About",
  description:
    "Coach Hayes is a 20-year high school football coach providing X's and O's analysis from a coach's perspective. Based in Calhoun, Georgia.",
};

export default function AboutPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6">
      <div className="flex flex-col items-center gap-8 text-center">
        <Image
          src="/logo.png"
          alt="Coach Hayes"
          width={180}
          height={180}
          className="h-36 w-36 rounded-lg object-contain"
        />
        <div className="space-y-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-red">
            About
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Coach Hayes Hudl
          </h1>
          <p className="text-lg text-zinc-300">
            Connecting fans to the fundamentals of football.
          </p>
        </div>
        <div className="space-y-4 text-left text-base text-zinc-300">
          <p>
            Coach Hayes is a 20-year high school football coach based in
            Calhoun, Georgia. He produces in-depth coaching analysis, player
            breakdowns, and recruit evaluations from a coach's perspective —
            with an emphasis on UGA.
          </p>
          <p>
            The channel covers offensive, defensive, and special-teams schemes
            across college football, with weekly breakdowns drawn from real
            installs and real game film. The deeper installs and play-by-play
            film studies live on Patreon; everything else is on YouTube and the
            podcast.
          </p>
        </div>
        <ul className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {SOCIAL_LINKS.map((s) => (
            <li key={s.key}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                title={s.label}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border text-zinc-300 transition-colors hover:border-brand-red hover:text-white"
              >
                <SocialIcon name={s.key} />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
