import { describe, expect, it } from "vitest";

import {
  campaignLookupColumn,
  campaignMessagesPath,
  campaignPath,
  campaignSlug,
  creatorCampaignPath,
} from "@/lib/campaign-paths";

const campaign = {
  id: "dddddddd-0000-4000-8000-000000000001",
  slug: "summer-fashion-reel-campaign-dddddddd",
};

describe("campaign paths", () => {
  it("uses the slug for every public-facing URL", () => {
    expect(campaignSlug(campaign)).toBe(campaign.slug);
    expect(creatorCampaignPath(campaign)).toBe(
      `/creator/campaigns/${campaign.slug}`,
    );
    expect(campaignPath(campaign, "applications")).toBe(
      `/business/campaigns/${campaign.slug}/applications`,
    );
    expect(campaignPath(campaign, "edit")).toBe(
      `/business/campaigns/${campaign.slug}/edit`,
    );
    expect(campaignMessagesPath(campaign)).toBe(
      `/business/messages/campaigns/${campaign.slug}`,
    );
  });

  it("falls back to the UUID when no slug is available", () => {
    expect(campaignSlug({ id: campaign.id })).toBe(campaign.id);
    expect(creatorCampaignPath({ id: campaign.id, slug: null })).toBe(
      `/creator/campaigns/${campaign.id}`,
    );
  });

  it("looks up UUIDs by id and readable references by slug", () => {
    expect(campaignLookupColumn(campaign.id)).toBe("id");
    expect(campaignLookupColumn(campaign.slug)).toBe("slug");
    expect(campaignLookupColumn("not-a-uuid")).toBe("slug");
  });
});
