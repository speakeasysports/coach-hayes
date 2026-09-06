import type { Metadata } from "next";
import { repo } from "@/lib/admin/repo";
import { WritingList } from "./writing-list";

export const metadata: Metadata = { title: "Writing" };

export default async function WritingPage() {
  const queue = await repo.getWritingQueue();
  const all = [...queue.concepts, ...queue.players];
  const done = all.filter((i) => i.text != null).length;

  return (
    <section>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Writing
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Two or three sentences on each concept and each player. This is the
          text search engines read and visitors judge the page on — right now
          most of these pages are a heading over a grid of thumbnails.
        </p>
        <p className="mt-1 text-sm text-muted">
          {done} of {all.length} written · unwritten first, most film first
        </p>
      </header>

      <WritingList concepts={queue.concepts} players={queue.players} />
    </section>
  );
}
