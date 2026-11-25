import { describe, expect, it } from "vitest";

import { campaignApplicationSchema } from "@/lib/validations/campaign";
import {
  collaborationTermsSchema,
  deliverableSubmissionSchema,
  messageSchema,
} from "@/lib/validations/collaboration";
import { profileEditSchema } from "@/lib/validations/profile";
import { portfolioItemSchema } from "@/lib/validations/portfolio";
import {
  REQUESTABLE_VERIFICATION_TYPES,
  verificationRequestSchema,
  VERIFICATION_EVIDENCE_MAX_BYTES,
  VERIFICATION_EVIDENCE_TYPES,
} from "@/lib/validations/verification";

const proposal = "I will create three short-form videos with a clear call to action.";

describe("campaignApplicationSchema", () => {
  const valid = {
    proposal,
    expected_price: "1250.50",
    currency: "usd",
  };

  it("normalises price and currency for the database", () => {
    const parsed = campaignApplicationSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.expected_price).toBe(1250.5);
      expect(parsed.data.currency).toBe("USD");
    }
  });

  it("rejects short proposals and malformed prices", () => {
    expect(campaignApplicationSchema.safeParse({ ...valid, proposal: "too short" }).success).toBe(
      false,
    );
    for (const expected_price of ["0.001", "-5", "1e3", "abc", ""]) {
      expect(campaignApplicationSchema.safeParse({ ...valid, expected_price }).success).toBe(false);
    }
    expect(campaignApplicationSchema.safeParse({ ...valid, currency: "dollars" }).success).toBe(
      false,
    );
  });
});

describe("collaboration schemas", () => {
  it("requires a non-blank message within the length limit", () => {
    expect(messageSchema.safeParse({ body: "   " }).success).toBe(false);
    expect(messageSchema.safeParse({ body: "Hello!" }).success).toBe(true);
    expect(messageSchema.safeParse({ body: "x".repeat(10_001) }).success).toBe(false);
  });

  it("validates negotiated terms and deadlines", () => {
    expect(
      collaborationTermsSchema.safeParse({
        agreed_price: "99.99",
        currency: "USD",
        deadline: "2026-12-31",
      }).success,
    ).toBe(true);
    expect(
      collaborationTermsSchema.safeParse({
        agreed_price: "99.999",
        currency: "US",
        deadline: "12/31/2026",
      }).success,
    ).toBe(false);
    expect(
      collaborationTermsSchema.safeParse({
        agreed_price: "99.99",
        currency: "USD",
        deadline: "2026-99-99",
      }).success,
    ).toBe(false);
  });

  it("limits deliverable links to HTTP(S) URLs", () => {
    expect(deliverableSubmissionSchema.safeParse({ asset_url: "" }).success).toBe(true);
    expect(deliverableSubmissionSchema.safeParse({ asset_url: "https://example.com/a" }).success).toBe(
      true,
    );
    expect(deliverableSubmissionSchema.safeParse({ asset_url: "javascript:alert(1)" }).success).toBe(
      false,
    );
    expect(
      deliverableSubmissionSchema.safeParse({ asset_url: "https://example.com/a".repeat(200) })
        .success,
    ).toBe(false);
  });
});

describe("verification requests", () => {
  it("only allows claims creators may open themselves", () => {
    for (const type of REQUESTABLE_VERIFICATION_TYPES) {
      expect(verificationRequestSchema.safeParse({ type }).success).toBe(true);
    }
    expect(verificationRequestSchema.safeParse({ type: "email" }).success).toBe(false);
    expect(verificationRequestSchema.safeParse({ type: "verified" }).success).toBe(false);
    expect(
      verificationRequestSchema.safeParse({
        type: "instagram_ownership",
        social_account_id: "not-a-uuid",
      }).success,
    ).toBe(false);
  });

  it("keeps the evidence limits in sync with storage policy", () => {
    expect(VERIFICATION_EVIDENCE_MAX_BYTES).toBe(10 * 1024 * 1024);
    expect(VERIFICATION_EVIDENCE_TYPES).toEqual([
      "image/png",
      "image/jpeg",
      "application/pdf",
    ]);
  });
});

describe("profile and portfolio input", () => {
  it("rejects attempts to smuggle role changes through profile updates", () => {
    const parsed = profileEditSchema.safeParse({
      fullName: "Mia Creator",
      username: "mia_123",
      role: "admin",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && "role" in parsed.data).toBe(false);
  });

  it("accepts only HTTP(S) avatar URLs", () => {
    const base = { fullName: "Mia Creator", username: "mia_123" };
    expect(profileEditSchema.safeParse({ ...base, avatarUrl: "https://example.com/a.png" }).success).toBe(
      true,
    );
    expect(profileEditSchema.safeParse({ ...base, avatarUrl: "javascript:alert(1)" }).success).toBe(
      false,
    );
  });

  it("requires a valid media type and URL", () => {
    expect(
      portfolioItemSchema.safeParse({
        title: "Launch film",
        media_type: "video_link",
        media_url: "https://example.com/film",
      }).success,
    ).toBe(true);
    expect(
      portfolioItemSchema.safeParse({
        title: "Launch film",
        media_type: "admin",
        media_url: "https://example.com/film",
      }).success,
    ).toBe(false);
    expect(
      portfolioItemSchema.safeParse({
        title: "Launch film",
        media_type: "video_link",
        media_url: "javascript:alert(1)",
      }).success,
    ).toBe(false);
  });
});
