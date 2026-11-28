import { describe, expect, it } from "vitest";

import {
  applicationConversationFilterFromValue,
  applicationFilterFromValue,
  applicationStatusLabel,
  applicationStatusesForFilter,
  campaignStatusLabel,
  campaignStatusValueForChoice,
  collaborationFilterFromValue,
  collaborationStatusLabel,
  collaborationStatusesForFilter,
  deliverableStatusLabel,
  friendlyStatusBody,
} from "@/lib/labels";

describe("simple workflow labels", () => {
  it("groups campaign states into four visible labels", () => {
    expect(campaignStatusLabel("draft")).toBe("Draft");
    expect(campaignStatusLabel("published")).toBe("Live");
    expect(campaignStatusLabel("active")).toBe("Live");
    expect(campaignStatusLabel("paused")).toBe("Paused");
    expect(campaignStatusLabel("closed")).toBe("Finished");
    expect(campaignStatusLabel("completed")).toBe("Finished");
  });

  it("groups application states into four visible labels", () => {
    expect(applicationStatusLabel("pending")).toBe("New");
    expect(applicationStatusLabel("accepted")).toBe("In talks");
    expect(applicationStatusLabel("finalized")).toBe("Selected");
    expect(applicationStatusLabel("rejected")).toBe("Closed");
    expect(applicationStatusLabel("withdrawn")).toBe("Closed");
  });

  it("groups collaboration states into four visible labels", () => {
    expect(collaborationStatusLabel("negotiating")).toBe("Getting started");
    expect(collaborationStatusLabel("agreement_pending")).toBe("Getting started");
    expect(collaborationStatusLabel("active")).toBe("In progress");
    expect(collaborationStatusLabel("submitted")).toBe("In progress");
    expect(collaborationStatusLabel("approved")).toBe("In progress");
    expect(collaborationStatusLabel("revision_requested")).toBe("Needs attention");
    expect(collaborationStatusLabel("disputed")).toBe("Needs attention");
    expect(collaborationStatusLabel("completed")).toBe("Finished");
    expect(collaborationStatusLabel("cancelled")).toBe("Finished");
  });

  it("keeps deliverable labels in their own vocabulary", () => {
    expect(deliverableStatusLabel("pending")).toBe("Not submitted");
    expect(deliverableStatusLabel("submitted")).toBe("Submitted");
    expect(deliverableStatusLabel("approved")).toBe("Approved");
  });
});

describe("workflow filters", () => {
  it("accepts new group values and old raw statuses", () => {
    expect(applicationFilterFromValue("in_talks")).toBe("in_talks");
    expect(applicationFilterFromValue("pending")).toBe("new");
    expect(applicationFilterFromValue("withdrawn")).toBe("closed");
    expect(applicationFilterFromValue(undefined)).toBe("all");
    expect(applicationFilterFromValue("nonsense")).toBe("all");
  });

  it("maps application groups back to database statuses", () => {
    expect(applicationStatusesForFilter("closed")).toEqual([
      "rejected",
      "withdrawn",
    ]);
    expect(applicationStatusesForFilter("in_talks")).toEqual(["accepted"]);
    expect(applicationConversationFilterFromValue("new")).toBe("pending");
    expect(applicationConversationFilterFromValue("selected")).toBe("finalized");
    expect(applicationConversationFilterFromValue("nonsense")).toBe("accepted");
  });

  it("maps collaboration groups back to database statuses", () => {
    expect(collaborationFilterFromValue("submitted")).toBe("in_progress");
    expect(collaborationFilterFromValue("disputed")).toBe("needs_attention");
    expect(collaborationFilterFromValue("negotiating")).toBe("all");
    expect(collaborationStatusesForFilter("needs_attention")).toEqual([
      "revision_requested",
      "disputed",
    ]);
  });
});

describe("campaign editor choices", () => {
  it("converts a simple choice into a database status", () => {
    expect(campaignStatusValueForChoice("draft", "active")).toBe("draft");
    expect(campaignStatusValueForChoice("live", "active")).toBe("active");
    expect(campaignStatusValueForChoice("live", "published")).toBe("published");
    expect(campaignStatusValueForChoice("paused", "published")).toBe("paused");
    expect(campaignStatusValueForChoice("done", "published")).toBe("completed");
    expect(campaignStatusValueForChoice("done", "closed")).toBe("closed");
  });
});

describe("notification copy", () => {
  it("replaces raw status tokens with plain language", () => {
    expect(friendlyStatusBody("Campaign — status: accepted")).toBe(
      "Campaign — status: In talks",
    );
    expect(friendlyStatusBody("Work — status: agreement_pending")).toBe(
      "Work — status: Getting started",
    );
    expect(friendlyStatusBody("Work — status: revision_requested")).toBe(
      "Work — status: Needs attention",
    );
    expect(friendlyStatusBody(null)).toBeNull();
  });
});
