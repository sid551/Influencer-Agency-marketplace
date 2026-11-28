import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  type CampaignStatus,
} from "@/types/campaign.types";
import {
  COLLABORATION_STATUSES,
  type CollaborationStatus,
  type DeliverableStatus,
} from "@/types/collaboration.types";
import type {
  SocialVerificationStatus,
  VerificationStatus,
} from "@/types/creator.types";

/**
 * Statuses are intentionally grouped into a few plain-English states. The
 * database keeps its detailed workflow, while both roles only see the state
 * that matters for their next action.
 */
export const SIMPLE_CAMPAIGN_STATUSES = [
  "draft",
  "live",
  "paused",
  "done",
] as const;
export type SimpleCampaignStatus = (typeof SIMPLE_CAMPAIGN_STATUSES)[number];

export const SIMPLE_APPLICATION_STATUSES = [
  "new",
  "in_talks",
  "selected",
  "closed",
] as const;
export type SimpleApplicationStatus =
  (typeof SIMPLE_APPLICATION_STATUSES)[number];

export const SIMPLE_COLLABORATION_STATUSES = [
  "setup",
  "in_progress",
  "needs_attention",
  "done",
] as const;
export type SimpleCollaborationStatus =
  (typeof SIMPLE_COLLABORATION_STATUSES)[number];

const SIMPLE_CAMPAIGN_LABELS: Record<SimpleCampaignStatus, string> = {
  draft: "Draft",
  live: "Live",
  paused: "Paused",
  done: "Finished",
};

const SIMPLE_APPLICATION_LABELS: Record<SimpleApplicationStatus, string> = {
  new: "New",
  in_talks: "In talks",
  selected: "Selected",
  closed: "Closed",
};

const SIMPLE_COLLABORATION_LABELS: Record<SimpleCollaborationStatus, string> = {
  setup: "Getting started",
  in_progress: "In progress",
  needs_attention: "Needs attention",
  done: "Finished",
};

/** Non-status labels (collaboration types, niches, platforms, verification). */
const LABELS: Record<string, string> = {
  paid: "Paid collaboration",
  ugc: "UGC content",
  affiliate: "Affiliate",
  product_seeding: "Product seeding",
  sponsorship: "Sponsorship",
  contest: "Contest",
  barter: "Barter (product swap)",
  unverified: "Not verified",
  verified: "Verified",
  manual_review: "In review",
  expired: "Expired",
  revoked: "Revoked",
};

/**
 * Readable but deterministic timestamp. A fixed locale and UTC timezone keep
 * server and client markup identical while avoiding raw ISO strings in the UI.
 */
export function formatUtcTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  const formatted = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date);
  return `${formatted} UTC`;
}

/** Human-readable label for a non-workflow enum value. */
export function label(value: string | null | undefined): string {
  if (!value) return "Not set";
  if (LABELS[value]) return LABELS[value];
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function simpleCampaignStatus(status: CampaignStatus): SimpleCampaignStatus {
  if (status === "draft") return "draft";
  if (status === "paused") return "paused";
  if (status === "published" || status === "active") return "live";
  return "done";
}

export function simpleApplicationStatus(
  status: ApplicationStatus,
): SimpleApplicationStatus {
  if (status === "pending") return "new";
  if (status === "accepted") return "in_talks";
  if (status === "finalized") return "selected";
  return "closed";
}

export function simpleCollaborationStatus(
  status: CollaborationStatus,
): SimpleCollaborationStatus {
  if (status === "negotiating" || status === "agreement_pending") return "setup";
  if (status === "revision_requested" || status === "disputed") {
    return "needs_attention";
  }
  if (status === "completed" || status === "cancelled") return "done";
  return "in_progress";
}

export function simpleCampaignStatusLabel(status: SimpleCampaignStatus): string {
  return SIMPLE_CAMPAIGN_LABELS[status];
}

export function simpleApplicationStatusLabel(
  status: SimpleApplicationStatus,
): string {
  return SIMPLE_APPLICATION_LABELS[status];
}

export function simpleCollaborationStatusLabel(
  status: SimpleCollaborationStatus,
): string {
  return SIMPLE_COLLABORATION_LABELS[status];
}

export function campaignStatusLabel(status: CampaignStatus): string {
  return simpleCampaignStatusLabel(simpleCampaignStatus(status));
}

export function applicationStatusLabel(status: ApplicationStatus): string {
  return simpleApplicationStatusLabel(simpleApplicationStatus(status));
}

export function collaborationStatusLabel(status: CollaborationStatus): string {
  return simpleCollaborationStatusLabel(simpleCollaborationStatus(status));
}

const DELIVERABLE_LABELS: Record<DeliverableStatus, string> = {
  pending: "Not submitted",
  submitted: "Submitted",
  approved: "Approved",
};

export function deliverableStatusLabel(status: DeliverableStatus): string {
  return DELIVERABLE_LABELS[status];
}

export function verificationStatusLabel(
  status: SocialVerificationStatus | VerificationStatus,
): string {
  return label(status);
}

export const SIMPLE_CAMPAIGN_STATUS_HELP: Record<
  SimpleCampaignStatus,
  string
> = {
  draft: "Only you can see this campaign.",
  live: "Creators can find it and apply.",
  paused: "Hidden from discovery for now.",
  done: "Work on this campaign is finished.",
};

export const SIMPLE_APPLICATION_STATUS_HELP: Record<
  SimpleApplicationStatus,
  string
> = {
  new: "Your proposal is waiting for a decision.",
  in_talks: "The details are being discussed in messages.",
  selected: "You were chosen. Continue in messages.",
  closed: "This application is closed. Explore other campaigns.",
};

export const SIMPLE_COLLABORATION_STATUS_HELP: Record<
  SimpleCollaborationStatus,
  string
> = {
  setup: "Agree on the details before work begins.",
  in_progress: "Work is underway — keep updates in messages.",
  needs_attention: "Something needs a reply or a decision.",
  done: "Everything is finished. The conversation stays available.",
};

export function collaborationStatusHelp(status: CollaborationStatus): string {
  return SIMPLE_COLLABORATION_STATUS_HELP[simpleCollaborationStatus(status)];
}

/**
 * The campaign editor offers four choices instead of the six stored states.
 * Choosing "Live" keeps an active campaign active rather than resetting it.
 */
export function campaignStatusValueForChoice(
  choice: SimpleCampaignStatus,
  currentStatus: CampaignStatus,
): CampaignStatus {
  if (choice === "live" && currentStatus === "active") return "active";
  if (choice === "live") return "published";
  if (choice === "done" && currentStatus === "closed") return "closed";
  if (choice === "draft") return "draft";
  if (choice === "paused") return "paused";
  return "completed";
}

export const SIMPLE_APPLICATION_FILTERS = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "in_talks", label: "In talks" },
  { value: "selected", label: "Selected" },
  { value: "closed", label: "Closed" },
] as const;
export type ApplicationFilter =
  (typeof SIMPLE_APPLICATION_FILTERS)[number]["value"];

export const SIMPLE_COLLABORATION_FILTERS = [
  { value: "all", label: "All" },
  { value: "in_progress", label: "In progress" },
  { value: "needs_attention", label: "Needs attention" },
  { value: "done", label: "Finished" },
] as const;
export type CollaborationFilter =
  (typeof SIMPLE_COLLABORATION_FILTERS)[number]["value"];

/** Accept both the new group values and old raw-status links. */
export function applicationFilterFromValue(
  value: string | undefined,
): ApplicationFilter {
  if (!value) return "all";
  if (
    SIMPLE_APPLICATION_FILTERS.some((filter) => filter.value === value)
  ) {
    return value as ApplicationFilter;
  }
  if (APPLICATION_STATUSES.includes(value as ApplicationStatus)) {
    return simpleApplicationStatus(value as ApplicationStatus);
  }
  return "all";
}

export function applicationStatusesForFilter(
  filter: ApplicationFilter,
): ApplicationStatus[] {
  if (filter === "all") return [...APPLICATION_STATUSES];
  return APPLICATION_STATUSES.filter(
    (status) => simpleApplicationStatus(status) === filter,
  );
}

/** The message list queries one status at a time, so map groups to a representative. */
export function applicationConversationFilterFromValue(
  value: string | undefined,
): ApplicationStatus | "all" {
  if (!value || value === "all") return "all";
  if (value === "new") return "pending";
  if (value === "in_talks") return "accepted";
  if (value === "selected") return "finalized";
  if (value === "closed") return "rejected";
  if (APPLICATION_STATUSES.includes(value as ApplicationStatus)) {
    return value as ApplicationStatus;
  }
  return "accepted";
}

export function collaborationFilterFromValue(
  value: string | undefined,
): CollaborationFilter {
  if (!value) return "all";
  if (
    SIMPLE_COLLABORATION_FILTERS.some((filter) => filter.value === value)
  ) {
    return value as CollaborationFilter;
  }
  if (COLLABORATION_STATUSES.includes(value as CollaborationStatus)) {
    const group = simpleCollaborationStatus(value as CollaborationStatus);
    if (
      SIMPLE_COLLABORATION_FILTERS.some((filter) => filter.value === group)
    ) {
      return group as CollaborationFilter;
    }
  }
  return "all";
}

export function collaborationStatusesForFilter(
  filter: CollaborationFilter,
): CollaborationStatus[] {
  if (filter === "all") return [...COLLABORATION_STATUSES];
  return COLLABORATION_STATUSES.filter(
    (status) => simpleCollaborationStatus(status) === filter,
  );
}

/** Replace raw workflow tokens in database-generated notification bodies. */
const PLAIN_STATUS_TERMS: Record<string, string> = {
  draft: "Draft",
  published: "Live",
  active: "In progress",
  paused: "Paused",
  closed: "Closed",
  completed: "Complete",
  pending: "New",
  accepted: "In talks",
  finalized: "Selected",
  rejected: "Closed",
  withdrawn: "Closed",
  negotiating: "Getting started",
  agreement_pending: "Getting started",
  in_progress: "In progress",
  submitted: "Submitted",
  revision_requested: "Needs attention",
  approved: "Approved",
  cancelled: "Finished",
  disputed: "Needs attention",
};

export function friendlyStatusBody(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return value.replace(
    /\b(status:\s*)(draft|published|active|paused|closed|completed|pending|accepted|finalized|rejected|withdrawn|negotiating|agreement_pending|in_progress|submitted|revision_requested|approved|cancelled|disputed)\b/g,
    (_match, prefix: string, status: string) =>
      `${prefix}${PLAIN_STATUS_TERMS[status] ?? status}`,
  );
}
