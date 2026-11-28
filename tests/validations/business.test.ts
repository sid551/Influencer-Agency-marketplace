import { describe, expect, it } from "vitest";

import {
  applicationDecisionSchema,
  businessCollaborationStatusSchema,
  businessCollaborationTermsSchema,
  businessDeliverablesSchema,
  businessProfileSchema,
  campaignCreateSchema,
  campaignUpdateSchema,
} from "@/lib/validations/business";

const validCampaign = {
  title: "Summer launch campaign",
  description: "We are launching a new summer collection and need creators.",
  category: "Fashion",
  platforms: ["instagram", "youtube"],
  target_niches: ["fashion", "lifestyle"],
  collaboration_type: "paid",
  budget_min: "500",
  budget_max: "1500.50",
  currency: "inr",
  deliverables: "1 reel\n2 stories",
  application_deadline: "2026-12-31",
  location: "",
  image_alt: "",
  status: "published",
};

describe("businessProfileSchema", () => {
  it("normalises blank optional fields to null", () => {
    const parsed = businessProfileSchema.safeParse({
      company_name: "  Acme Inc.  ",
      website: "",
      description: "  ",
      industry: "Fashion",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({
        company_name: "Acme Inc.",
        website: null,
        description: null,
        industry: "Fashion",
      });
    }
  });

  it("rejects non-HTTP(S) websites", () => {
    const parsed = businessProfileSchema.safeParse({
      company_name: "Acme",
      website: "javascript:alert(1)",
      description: "",
      industry: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("requires a company name", () => {
    const parsed = businessProfileSchema.safeParse({
      company_name: " ",
      website: "",
      description: "",
      industry: "",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("campaignCreateSchema", () => {
  it("converts FormData strings to database values", () => {
    const parsed = campaignCreateSchema.safeParse(validCampaign);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.budget_min).toBe(500);
      expect(parsed.data.budget_max).toBe(1500.5);
      expect(parsed.data.currency).toBe("INR");
      expect(parsed.data.deliverables).toEqual(["1 reel", "2 stories"]);
      expect(parsed.data.application_deadline).toBe("2026-12-31");
      expect(parsed.data.location).toBeNull();
    }
  });

  it("only allows draft and published on creation", () => {
    const parsed = campaignCreateSchema.safeParse({
      ...validCampaign,
      status: "active",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects unsupported platforms", () => {
    const parsed = campaignCreateSchema.safeParse({
      ...validCampaign,
      platforms: ["myspace", "tiktok"],
    });
    expect(parsed.success).toBe(false);
  });

  it("requires target niches and rejects duplicates", () => {
    expect(
      campaignCreateSchema.safeParse({ ...validCampaign, target_niches: [] }).success,
    ).toBe(false);
    expect(
      campaignCreateSchema.safeParse({
        ...validCampaign,
        target_niches: ["fashion", "fashion"],
      }).success,
    ).toBe(false);
    expect(
      campaignCreateSchema.safeParse({
        ...validCampaign,
        target_niches: ["not-a-niche"],
      }).success,
    ).toBe(false);
  });

  it("requires at least one platform and deliverable", () => {
    expect(
      campaignCreateSchema.safeParse({ ...validCampaign, platforms: [] }).success,
    ).toBe(false);
    expect(
      campaignCreateSchema.safeParse({ ...validCampaign, deliverables: "  \n " })
        .success,
    ).toBe(false);
  });

  it("rejects a maximum budget below the minimum", () => {
    const parsed = campaignCreateSchema.safeParse({
      ...validCampaign,
      budget_max: "100",
    });
    expect(parsed.success).toBe(false);
  });

  it("normalises and limits the image description", () => {
    const parsed = campaignCreateSchema.safeParse({
      ...validCampaign,
      image_alt: "  Product shoot  ",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.image_alt).toBe("Product shoot");

    expect(
      campaignCreateSchema.safeParse({
        ...validCampaign,
        image_alt: "x".repeat(151),
      }).success,
    ).toBe(false);
  });
});

describe("campaignUpdateSchema", () => {
  it("allows editing a live campaign", () => {
    const parsed = campaignUpdateSchema.safeParse({
      ...validCampaign,
      status: "active",
    });
    expect(parsed.success).toBe(true);
  });

  it("still validates the brief", () => {
    const parsed = campaignUpdateSchema.safeParse({
      ...validCampaign,
      description: "too short",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("applicationDecisionSchema", () => {
  it("accepts only business review decisions", () => {
    expect(applicationDecisionSchema.safeParse("shortlisted").success).toBe(false);
    expect(applicationDecisionSchema.safeParse("accepted").success).toBe(true);
    expect(applicationDecisionSchema.safeParse("finalized").success).toBe(true);
    expect(applicationDecisionSchema.safeParse("rejected").success).toBe(true);
    expect(applicationDecisionSchema.safeParse("withdrawn").success).toBe(false);
  });
});

describe("businessCollaborationStatusSchema", () => {
  it("accepts collaboration statuses only", () => {
    expect(businessCollaborationStatusSchema.safeParse("submitted").success).toBe(
      true,
    );
    expect(businessCollaborationStatusSchema.safeParse("accepted").success).toBe(
      false,
    );
  });
});

describe("businessCollaborationTermsSchema", () => {
  it("reuses the shared terms rules", () => {
    const parsed = businessCollaborationTermsSchema.safeParse({
      terms: "One reel",
      agreed_price: "750.50",
      currency: "inr",
      deadline: "2026-12-31",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.agreed_price).toBe("750.50");
      expect(parsed.data.currency).toBe("INR");
    }
  });

  it("requires a price", () => {
    expect(
      businessCollaborationTermsSchema.safeParse({
        terms: "",
        agreed_price: "",
        currency: "INR",
      }).success,
    ).toBe(false);
  });
});

describe("businessDeliverablesSchema", () => {
  const deliverables = [
    {
      id: "20202020-0000-4000-8000-000000000001",
      title: " Instagram reel ",
      due_date: "2026-12-05",
    },
    {
      id: "20202020-0000-4000-8000-000000000002",
      title: "Two story frames",
      due_date: "",
    },
  ];

  it("parses the editor JSON and trims titles", () => {
    const parsed = businessDeliverablesSchema.safeParse({
      deliverables: JSON.stringify(deliverables),
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.deliverables).toEqual([
        {
          id: deliverables[0].id,
          title: "Instagram reel",
          due_date: "2026-12-05",
        },
        {
          id: deliverables[1].id,
          title: "Two story frames",
          due_date: null,
        },
      ]);
    }
  });

  it("rejects malformed JSON and duplicate ids", () => {
    expect(
      businessDeliverablesSchema.safeParse({ deliverables: "not json" }).success,
    ).toBe(false);
    expect(
      businessDeliverablesSchema.safeParse({
        deliverables: JSON.stringify([deliverables[0], deliverables[0]]),
      }).success,
    ).toBe(false);
  });
});
