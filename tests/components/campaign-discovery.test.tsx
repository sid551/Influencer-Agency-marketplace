import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CampaignDiscovery } from "@/app/creator/discover/page-client";
import type { Campaign } from "@/types/campaign.types";

function campaign(id: string, title: string, description: string): Campaign {
  return {
    id,
    business_profile_id: "business-1",
    title,
    description,
    category: "lifestyle",
    platforms: ["instagram"],
    collaboration_type: "paid",
    budget_min: 100,
    budget_max: 500,
    currency: "INR",
    deliverables: ["1 reel"],
    application_deadline: null,
    location: null,
    status: "published",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

const campaigns = [
  campaign("campaign-1", "Sunset skincare launch", "Summer skincare campaign"),
  campaign("campaign-2", "Winter tech review", "Gadget review series"),
];

describe("CampaignDiscovery", () => {
  it("shows all campaigns before filtering", () => {
    render(<CampaignDiscovery campaigns={campaigns} />);
    expect(screen.getByText("2 of 2 campaigns")).toBeInTheDocument();
    expect(screen.getByText("Sunset skincare launch")).toBeInTheDocument();
    expect(screen.getByText("Winter tech review")).toBeInTheDocument();
  });

  it("filters by a case-insensitive search term", () => {
    render(<CampaignDiscovery campaigns={campaigns} />);
    fireEvent.change(screen.getByPlaceholderText(/Search title/), {
      target: { value: "SUNSET" },
    });

    expect(screen.getByText("1 of 2 campaigns")).toBeInTheDocument();
    expect(screen.getByText("Sunset skincare launch")).toBeInTheDocument();
    expect(screen.queryByText("Winter tech review")).not.toBeInTheDocument();
  });

  it("shows an empty state when nothing matches", () => {
    render(<CampaignDiscovery campaigns={campaigns} />);
    fireEvent.change(screen.getByPlaceholderText(/Search title/), {
      target: { value: "no-such-campaign" },
    });

    expect(screen.getByText("0 of 2 campaigns")).toBeInTheDocument();
    expect(screen.getByText(/No campaigns match your filters/)).toBeInTheDocument();
  });
});
