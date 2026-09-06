import { Fragment } from "react";

/**
 * Renders `*word*` in brand red so a heading can carry the accent the design
 * uses without the admin having to type HTML. Everything outside the asterisks
 * is plain text — this is not a markdown renderer and deliberately supports
 * exactly one thing.
 */
export function Emphasis({ text }: { text: string }) {
  const parts = text.split(/\*([^*]+)\*/g);
  return (
    <>
      {parts.map((part, i) =>
        // Odd indices are the captured groups, i.e. what was between asterisks.
        i % 2 === 1 ? (
          <span key={i} className="text-brand-red">
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
