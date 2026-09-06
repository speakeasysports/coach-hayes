import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { repo } from "@/lib/admin/repo";
import { CopyForm } from "./copy-form";

type Props = { params: Promise<{ page: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page } = await params;
  const state = await repo.getPageCopy(page);
  return { title: state ? `${state.label} content` : "Content" };
}

export default async function ContentPage({ params }: Props) {
  const { page } = await params;
  const state = await repo.getPageCopy(page);
  if (!state) notFound();

  return (
    <section>
      <Link
        href="/admin/content"
        className="text-sm text-muted transition-colors hover:text-white"
      >
        ← All pages
      </Link>

      <header className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          {state.label}
        </h1>
        <Link
          href={state.path}
          target="_blank"
          className="text-sm text-muted transition-colors hover:text-white"
        >
          View page ↗
        </Link>
      </header>

      <CopyForm pageId={state.id} path={state.path} fields={state.fields} />
    </section>
  );
}
