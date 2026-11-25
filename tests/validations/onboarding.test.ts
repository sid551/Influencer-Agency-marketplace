import { describe, expect, it } from "vitest";

import {
  COLLABORATION_PREFERENCES,
  CONTENT_TYPE_OPTIONS,
  LANGUAGE_OPTIONS,
  NICHE_OPTIONS,
  SOCIAL_PLATFORMS,
} from "@/types/creator.types";
import {
  getStepSchema,
  onboardingStepSchemas,
  socialAccountSchema,
  TOTAL_ONBOARDING_STEPS,
} from "@/lib/validations/onboarding";

describe("onboarding step schemas", () => {
  it("has exactly one schema per wizard step", () => {
    expect(TOTAL_ONBOARDING_STEPS).toBe(12);
    expect(Object.keys(onboardingStepSchemas)).toHaveLength(12);
    for (let step = 1; step <= TOTAL_ONBOARDING_STEPS; step++) {
      expect(getStepSchema(step)).toBeDefined();
    }
  });

  it("rejects out-of-range and fractional steps", () => {
    expect(getStepSchema(0)).toBeNull();
    expect(getStepSchema(13)).toBeNull();
    expect(getStepSchema(1.5)).toBeNull();
    expect(getStepSchema(Number.NaN)).toBeNull();
  });

  it("validates the identity fields stored in profiles", () => {
    expect(getStepSchema(1)!.safeParse({ fullName: "Mia" }).success).toBe(true);
    expect(getStepSchema(1)!.safeParse({ fullName: "M" }).success).toBe(false);
    expect(getStepSchema(2)!.safeParse({ username: "mia_123" }).success).toBe(true);
    expect(getStepSchema(2)!.safeParse({ username: "bad name!" }).success).toBe(false);
  });

  it("validates avatar and phone without forcing optional values", () => {
    expect(getStepSchema(3)!.safeParse({ avatarUrl: "" }).success).toBe(true);
    expect(getStepSchema(3)!.safeParse({ avatarUrl: "not-a-url" }).success).toBe(false);
    expect(getStepSchema(3)!.safeParse({ avatarUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(getStepSchema(11)!.safeParse({ phone: "" }).success).toBe(true);
    expect(getStepSchema(11)!.safeParse({ phone: "+1 (555) 123-4567" }).success).toBe(true);
    expect(getStepSchema(11)!.safeParse({ phone: "call me" }).success).toBe(false);
  });

  it("enforces option whitelists and counts", () => {
    expect(getStepSchema(6)!.safeParse({ niches: [NICHE_OPTIONS[0]] }).success).toBe(true);
    expect(getStepSchema(6)!.safeParse({ niches: [] }).success).toBe(false);
    expect(getStepSchema(6)!.safeParse({ niches: ["not-a-niche"] }).success).toBe(false);
    expect(getStepSchema(6)!.safeParse({ niches: NICHE_OPTIONS.slice(0, 6) }).success).toBe(false);
    expect(getStepSchema(7)!.safeParse({ languages: [LANGUAGE_OPTIONS[0]] }).success).toBe(true);
    expect(getStepSchema(8)!.safeParse({ contentTypes: [CONTENT_TYPE_OPTIONS[0]] }).success).toBe(
      true,
    );
    expect(
      getStepSchema(10)!.safeParse({
        collaborationPreferences: [COLLABORATION_PREFERENCES[0]],
      }).success,
    ).toBe(true);
  });

  it("strips unknown fields on no-input steps", () => {
    const parsed = getStepSchema(9)!.safeParse({ role: "admin", onboardingStep: 12 });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toEqual({});
  });
});

describe("socialAccountSchema", () => {
  it("accepts curated platforms and safe usernames", () => {
    expect(
      socialAccountSchema.safeParse({ platform: SOCIAL_PLATFORMS[0], username: "mia.creates" })
        .success,
    ).toBe(true);
  });

  it("rejects arbitrary platforms and usernames with URL characters", () => {
    expect(socialAccountSchema.safeParse({ platform: "admin", username: "mia" }).success).toBe(
      false,
    );
    expect(
      socialAccountSchema.safeParse({ platform: "instagram", username: "m?redirect=//evil" })
        .success,
    ).toBe(false);
  });
});
