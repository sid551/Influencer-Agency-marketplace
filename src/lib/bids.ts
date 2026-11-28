import { label } from "@/lib/labels";
import type { BusinessApplication } from "@/types/business.types";
import { NICHE_OPTIONS, type Niche } from "@/types/creator.types";

/**
 * Creator applications are the marketplace bids: each one carries the rate
 * the creator quoted. These helpers power the business bid table without
 * adding another status vocabulary or a duplicate bids table.
 */
export const BID_SORTS = [
  { value: "newest", label: "Newest" },
  { value: "rate_asc", label: "Lowest rate" },
  { value: "rate_desc", label: "Highest rate" },
] as const;
export type BidSort = (typeof BID_SORTS)[number]["value"];

export function bidSortFromValue(value: string | undefined): BidSort {
  if (value === "rate_asc" || value === "rate_desc") return value;
  return "newest";
}

export function nicheFilterFromValue(value: string | undefined): Niche | "all" {
  if (!value) return "all";
  return NICHE_OPTIONS.includes(value as Niche) ? (value as Niche) : "all";
}

/** Niche options that actually appear in this campaign's applicant pool. */
export function bidNicheOptions(
  applications: BusinessApplication[],
): Array<{ value: Niche; label: string }> {
  const present = new Set<Niche>();
  for (const application of applications) {
    for (const niche of application.creator?.niches ?? []) {
      if (NICHE_OPTIONS.includes(niche as Niche)) present.add(niche as Niche);
    }
  }
  return NICHE_OPTIONS.filter((niche) => present.has(niche)).map((niche) => ({
    value: niche,
    label: label(niche),
  }));
}

export function filterBidsByNiche(
  applications: BusinessApplication[],
  niche: Niche | "all",
): BusinessApplication[] {
  if (niche === "all") return applications;
  return applications.filter((application) =>
    (application.creator?.niches ?? []).includes(niche),
  );
}

export function sortBids(
  applications: BusinessApplication[],
  sort: BidSort,
): BusinessApplication[] {
  const sorted = [...applications];
  if (sort === "newest") {
    return sorted.sort(
      (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
    );
  }
  const direction = sort === "rate_asc" ? 1 : -1;
  return sorted.sort((a, b) => {
    const rateDifference = (a.expected_price - b.expected_price) * direction;
    if (rateDifference !== 0) return rateDifference;
    return Date.parse(b.created_at) - Date.parse(a.created_at);
  });
}
