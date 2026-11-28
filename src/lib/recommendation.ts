/**
 * Pure helpers that mirror the deterministic scoring in the
 * `recommend_creator_campaigns` Postgres RPC (migration 20261128000002).
 * Keeping the thresholds here makes them easy to test and gives the UI
 * one place to map a score to a section and a human-readable label.
 */

import type { RecommendationSection } from "@/types/recommendation.types";

export type { RecommendationSection };

export const MATCH_SCORES = {
  primary: 100,
  secondary: 60,
  related: 30,
  none: 10,
} as const;

export const RECOMMENDATION_SECTIONS: ReadonlyArray<{
  key: RecommendationSection;
  title: string;
  label: string;
  description: string;
}> = [
  {
    key: "recommended",
    title: "Recommended for You",
    label: "High Match",
    description: "Campaigns targeting your primary or secondary niche.",
  },
  {
    key: "related",
    title: "Related Campaigns",
    label: "Related",
    description: "Campaigns in niches adjacent to the ones you create in.",
  },
  {
    key: "explore",
    title: "Explore Other Campaigns",
    label: "Explore",
    description: "Everything else that is open — worth a look.",
  },
];

/** Best tier wins; scores are never summed across niches. */
export function sectionForScore(score: number): RecommendationSection {
  if (score >= MATCH_SCORES.secondary) return "recommended";
  if (score >= MATCH_SCORES.related) return "related";
  return "explore";
}

export function labelForSection(section: RecommendationSection): string {
  return RECOMMENDATION_SECTIONS.find((item) => item.key === section)?.label ?? "Explore";
}
