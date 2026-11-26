import { describe, expect, it } from "vitest";

import {
  BUSINESS_COLLABORATION_TRANSITIONS,
  COLLABORATION_STATUSES,
} from "@/types/collaboration.types";

describe("BUSINESS_COLLABORATION_TRANSITIONS", () => {
  it("mirrors the database trigger for negotiation and review states", () => {
    expect(BUSINESS_COLLABORATION_TRANSITIONS.negotiating).toEqual([
      "agreement_pending",
      "cancelled",
    ]);
    expect(BUSINESS_COLLABORATION_TRANSITIONS.agreement_pending).toEqual([
      "negotiating",
      "active",
      "cancelled",
    ]);
    expect(BUSINESS_COLLABORATION_TRANSITIONS.submitted).toEqual([
      "approved",
      "revision_requested",
      "disputed",
    ]);
    expect(BUSINESS_COLLABORATION_TRANSITIONS.approved).toEqual([
      "completed",
      "disputed",
    ]);
  });

  it("does not let a business submit work or approve its own active collaboration", () => {
    expect(BUSINESS_COLLABORATION_TRANSITIONS.active).toEqual(["disputed"]);
    expect(BUSINESS_COLLABORATION_TRANSITIONS.revision_requested).toEqual([
      "disputed",
    ]);
  });

  it("treats completed, cancelled and disputed as terminal", () => {
    for (const status of ["completed", "cancelled", "disputed"] as const) {
      expect(BUSINESS_COLLABORATION_TRANSITIONS[status]).toEqual([]);
    }
  });

  it("covers every collaboration status with valid transitions", () => {
    for (const status of COLLABORATION_STATUSES) {
      expect(BUSINESS_COLLABORATION_TRANSITIONS[status]).toBeDefined();
      for (const next of BUSINESS_COLLABORATION_TRANSITIONS[status]) {
        expect(COLLABORATION_STATUSES).toContain(next);
      }
    }
  });
});
