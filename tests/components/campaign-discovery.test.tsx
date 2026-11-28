import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CampaignDiscovery } from "@/app/creator/discover/page-client";
import type {
  RecommendationPage,
  RecommendedCampaign,
} from "@/types/recommendation.types";

function campaign(
  id: string,
  title: string,
  section: RecommendedCampaign["match_section"],
  score: number,
  niches: string[],
): RecommendedCampaign {
  return {
    id,
    slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-test1234`,
    business_profile_id: "business-1",
    title,
    description: "A short campaign description.",
    category: "lifestyle",
    platforms: ["instagram"],
    collaboration_type: "paid",
    budget_min: 100,
    budget_max: 500,
    currency: "INR",
    deliverables: ["1 reel"],
    application_deadline: null,
    location: null,
    image_url: null,
    image_public_id: null,
    image_alt: null,
    status: "published",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    target_niches: niches,
    match_score: score,
    match_section: section,
    total_count: 1,
  };
}

function section(
  key: RecommendationPage["section"],
  items: RecommendedCampaign[],
): RecommendationPage {
  return {
    section: key,
    items,
    total: items.length,
    page: 1,
    pageSize: 6,
    totalPages: 1,
  };
}

const sections = [
  section("recommended", [
    campaign("campaign-1", "Sunset skincare launch", "recommended", 100, ["beauty"]),
  ]),
  section("related", [
    campaign("campaign-2", "Weekend getaway reel", "related", 30, ["travel"]),
  ]),
  section("explore", [
    campaign("campaign-3", "Winter tech review", "explore", 10, ["tech"]),
  ]),
];

describe("CampaignDiscovery", () => {
  it("renders all three personalised sections with their match labels", () => {
    render(<CampaignDiscovery sections={sections} />);

    expect(screen.getByRole("heading", { name: "Recommended for You" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Related Campaigns" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Explore Other Campaigns" })).toBeInTheDocument();
    expect(screen.getByText("High Match")).toBeInTheDocument();
    expect(screen.getByText("Related")).toBeInTheDocument();
    expect(screen.getByText("Explore")).toBeInTheDocument();
  });

  it("shows niche tags on each campaign card", () => {
    render(<CampaignDiscovery sections={sections} />);

    expect(screen.getByText("Beauty")).toBeInTheDocument();
    expect(screen.getByText("Travel")).toBeInTheDocument();
    expect(screen.getByText("Tech")).toBeInTheDocument();
  });

  it("shows an empty state for a section with no campaigns", () => {
    render(
      <CampaignDiscovery
        sections={[
          sections[0],
          section("related", []),
          sections[2],
        ]}
      />,
    );
    expect(screen.getAllByText("Nothing here yet")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Related Campaigns" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recommended for You" })).toBeInTheDocument();
  });

  it("renders pagination links when a section has multiple pages", () => {
    const paged: RecommendationPage = {
      ...section("explore", [campaign("campaign-4", "More tech", "explore", 10, ["tech"])]),
      total: 8,
      totalPages: 2,
    };
    render(<CampaignDiscovery sections={[paged]} />);

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Next/ })).toHaveAttribute(
      "href",
      "/creator/discover?explore=2",
    );
  });
});
