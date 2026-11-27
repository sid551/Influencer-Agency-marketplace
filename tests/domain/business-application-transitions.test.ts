import { describe, expect, it } from "vitest";

import {
  APPLICATION_STATUSES,
  BUSINESS_APPLICATION_TRANSITIONS,
} from "@/types/campaign.types";

describe("BUSINESS_APPLICATION_TRANSITIONS", () => {
  it("mirrors the database trigger for pending and accepted", () => {
    expect(BUSINESS_APPLICATION_TRANSITIONS.pending).toEqual([
      "accepted",
      "rejected",
    ]);
    expect(BUSINESS_APPLICATION_TRANSITIONS.accepted).toEqual([
      "finalized",
      "rejected",
    ]);
  });

  it("treats finalized, rejected and withdrawn as terminal", () => {
    for (const status of ["finalized", "rejected", "withdrawn"] as const) {
      expect(BUSINESS_APPLICATION_TRANSITIONS[status]).toEqual([]);
    }
  });

  it("covers every application status with valid decisions", () => {
    for (const status of APPLICATION_STATUSES) {
      expect(BUSINESS_APPLICATION_TRANSITIONS[status]).toBeDefined();
      for (const decision of BUSINESS_APPLICATION_TRANSITIONS[status]) {
        expect(APPLICATION_STATUSES).toContain(decision);
      }
    }
  });
});
