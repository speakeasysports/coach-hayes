import type { Metadata } from "next";
import { ComingSoon } from "@/components/site/coming-soon";

export const metadata: Metadata = {
  title: "Big Board",
  description:
    "Every UGA recruit by position, each linked to a film breakdown. Coming soon.",
};

export default function BigBoardPage() {
  return (
    <ComingSoon
      eyebrow="Recruits"
      title="The Big Board lands in Phase 3"
      body="Every recruit by position with a film breakdown. Filter by status, class year, or position group."
      phase="Coming in Phase 3 — Big Board build."
    />
  );
}
