/**
 * Closed-vocabulary auto-tagging: concepts, topics, position-group overrides.
 *
 * Concept patterns come from the DATABASE (concepts.matchPatterns, seeded from
 * lib/ingest/lexicon.ts) so they can be tuned without a deploy. Topic and
 * position-group patterns come straight from the lexicon — they are closed
 * enums with no document to hang a tunable column on.
 *
 * The extraction script's flat list spans three destinations; tagDestination()
 * routes every entry so nothing is silently dropped (a schema-fit run caught
 * 13/47 tags with nowhere to land before this fan-out existed).
 *
 * Callers must strip description boilerplate first (lexicon.ts) — the channel
 * template mentions recruits/commits and false-positives half the catalog.
 */
import {
  positionGroupFromSlug,
  tagDestination,
  TopicSchema,
  type PositionGroup,
  type Topic,
} from "../schema";
import { LEXICON } from "./lexicon";

export type TagInput = { title: string; strippedDescription: string };
export type Tags = {
  conceptIds: number[];
  topics: Topic[];
  positionGroups: PositionGroup[];
};

export type ConceptPatternRow = {
  id: number;
  slug: string;
  matchPatterns: string[];
};

type Compiled = { rx: RegExp[] };

function compile(sources: string[]): Compiled {
  return { rx: sources.map((s) => new RegExp(s, "i")) };
}

function hits(c: Compiled, v: TagInput): boolean {
  return c.rx.some((r) => r.test(v.title) || r.test(v.strippedDescription));
}

export function buildTagger(
  conceptRows: ReadonlyArray<ConceptPatternRow>,
): (video: TagInput) => Tags {
  const conceptMatchers = conceptRows
    .filter((c) => c.matchPatterns.length > 0)
    .map((c) => ({ id: c.id, compiled: compile(c.matchPatterns) }));

  const topicMatchers: Array<{ topic: Topic; compiled: Compiled }> = [];
  const groupMatchers: Array<{ group: PositionGroup; compiled: Compiled }> = [];

  for (const entry of LEXICON) {
    const dest = tagDestination(entry.family);
    if (dest === "concept") continue; // served from the DB rows above
    if (dest === "topic") {
      const parsed = TopicSchema.safeParse(entry.slug);
      if (!parsed.success)
        throw new Error(`lexicon topic "${entry.slug}" not in TOPICS enum`);
      topicMatchers.push({
        topic: parsed.data,
        compiled: compile([entry.rx.source]),
      });
    } else {
      const group = positionGroupFromSlug(entry.slug);
      if (!group)
        throw new Error(`lexicon position group "${entry.slug}" has no mapping`);
      groupMatchers.push({ group, compiled: compile([entry.rx.source]) });
    }
  }

  return (video) => ({
    conceptIds: conceptMatchers
      .filter((m) => hits(m.compiled, video))
      .map((m) => m.id),
    topics: topicMatchers
      .filter((m) => hits(m.compiled, video))
      .map((m) => m.topic),
    positionGroups: groupMatchers
      .filter((m) => hits(m.compiled, video))
      .map((m) => m.group),
  });
}
