import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PATREON_URL } from "@/lib/links";
import { SocialIcon } from "@/components/site/social-icon";
import { getCopy } from "@/lib/content/get-copy";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: "About", description: copy["about.meta.description"] };
}

export default async function AboutPage() {
  const copy = await getCopy();
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
            {copy["about.eyebrow"]}
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {copy["about.title"]}
          </h1>
          <p className="text-lg text-zinc-300">{copy["about.tagline"]}</p>
        </div>
        <div className="space-y-4 text-left text-base text-zinc-300">
          <p>{copy["about.body1"]}</p>
          <p>{copy["about.body2"]}</p>
        </div>
        {/*
          The eight social icons that used to sit here are the same eight the
          footer renders about 160px below. One row is enough; this space goes
          to the two things a reader of this page might actually want next.
        */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/film"
            className="rounded-md bg-brand-red px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-red-hover"
          >
            {copy["about.primaryCta"]}
          </Link>
          <a
            href={PATREON_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-5 py-3 text-base font-semibold text-white transition-colors hover:border-brand-red"
          >
            <SocialIcon name="patreon" className="h-5 w-5" />
            {copy["about.secondaryCta"]}
          </a>
        </div>
      </div>
    </section>
  );
}
