import { describe, expect, it } from "vitest";

import {
  bidNicheOptions,
  bidSortFromValue,
  filterBidsByNiche,
  nicheFilterFromValue,
  sortBids,
} from "@/lib/bids";
import type { BusinessApplication } from "@/types/business.types";
import type { ApplicationStatus } from "@/types/campaign.types";
import type { Niche } from "@/types/creator.types";

function bid(
  id: string,
  expectedPrice: number,
  niches: Niche[],
  createdAt: string,
  status: ApplicationStatus = "pending",
): BusinessApplication {
  return {
    id,
    campaign_id: "campaign-1",
    creator_profile_id: id,
    proposal: `Proposal ${id}`,
    why_suitable: null,
    expected_price: expectedPrice,
    currency: "INR",
    status,
    created_at: createdAt,
    updated_at: createdAt,
    campaign: null,
    creator: {
      profile_id: id,
      full_name: `Creator ${id}`,
      username: `creator_${id}`,
      avatar_url: null,
      city: null,
      state: null,
      niches,
    },
  };
}

const applications = [
  bid("a", 900, ["fashion", "beauty"], "2026-01-03T00:00:00Z"),
  bid("b", 400, ["tech"], "2026-01-02T00:00:00Z"),
  bid("c", 650, ["fashion"], "2026-01-01T00:00:00Z"),
];

describe("creator bid helpers", () => {
  it("filters applicants by niche", () => {
    expect(
      filterBidsByNiche(applications, "fashion").map((item) => item.id),
    ).toEqual(["a", "c"]);
    expect(filterBidsByNiche(applications, "all")).toHaveLength(3);
  });

  it("sorts by quoted rate or newest application", () => {
    expect(
      sortBids(applications, "rate_asc").map((item) => item.expected_price),
    ).toEqual([400, 650, 900]);
    expect(
      sortBids(applications, "rate_desc").map((item) => item.expected_price),
    ).toEqual([900, 650, 400]);
    expect(sortBids(applications, "newest").map((item) => item.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("only offers niches present in the applicant pool", () => {
    expect(bidNicheOptions(applications)).toEqual([
      { value: "fashion", label: "Fashion" },
      { value: "beauty", label: "Beauty" },
      { value: "tech", label: "Tech" },
    ]);
  });

  it("falls back safely on unknown query values", () => {
    expect(bidSortFromValue("rate_desc")).toBe("rate_desc");
    expect(bidSortFromValue("unknown")).toBe("newest");
    expect(nicheFilterFromValue("fashion")).toBe("fashion");
    expect(nicheFilterFromValue("unknown")).toBe("all");
  });
});
