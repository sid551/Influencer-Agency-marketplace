import { describe, expect, it } from "vitest";

import {
  COLLABORATION_STATUSES,
  CREATOR_COLLABORATION_TRANSITIONS,
} from "@/types/collaboration.types";

describe("creator collaboration transitions", () => {
  it("covers every database status", () => {
    expect(Object.keys(CREATOR_COLLABORATION_TRANSITIONS).sort()).toEqual(
      [...COLLABORATION_STATUSES].sort(),
    );
  });

  it("never lets a creator self-approve or complete without approval", () => {
    for (const targets of Object.values(CREATOR_COLLABORATION_TRANSITIONS)) {
      expect(targets).not.toContain("approved");
    }
    expect(CREATOR_COLLABORATION_TRANSITIONS.submitted).not.toContain("approved");
    expect(CREATOR_COLLABORATION_TRANSITIONS.active).not.toContain("completed");
  });

  it("locks terminal states", () => {
    for (const status of ["completed", "cancelled", "disputed"] as const) {
      expect(CREATOR_COLLABORATION_TRANSITIONS[status]).toEqual([]);
    }
  });

  it("only permits dispute after submission", () => {
    expect(CREATOR_COLLABORATION_TRANSITIONS.submitted).toEqual(["disputed"]);
    expect(CREATOR_COLLABORATION_TRANSITIONS.approved).toEqual(["completed"]);
  });
});
