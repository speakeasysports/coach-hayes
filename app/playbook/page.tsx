import type { Metadata } from "next";
import { ComingSoon } from "@/components/site/coming-soon";

export const metadata: Metadata = {
  title: "Playbook",
  description:
    "Georgia's weekly installs — plays grouped by formation, each linked to a film breakdown. Coming soon.",
};

export default function PlaybookPage() {
  return (
    <ComingSoon
      eyebrow="Game film"
      title="The Weekly Playbook lands in Phase 4"
      body="Georgia's installs, week by week. Plays grouped by formation, each one linked to a film breakdown."
      phase="Coming in Phase 4 — Playbook build."
    />
  );
}
