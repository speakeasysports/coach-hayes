import type { Metadata } from "next";
import Link from "next/link";
import { PatreonForm } from "../patreon-form";

export const metadata: Metadata = { title: "Add a Patreon post" };

export default function NewPatreonPostPage() {
  return (
    <section>
      <Link
        href="/admin/patreon"
        className="text-sm text-muted transition-colors hover:text-white"
      >
        ← Patreon shelf
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
        Add a Patreon post
      </h1>
      <PatreonForm
        id={null}
        url=""
        title=""
        teaser={null}
        thumbnailUrl={null}
        postedAt={null}
        published={false}
        previewSlug={null}
      />
    </section>
  );
}
