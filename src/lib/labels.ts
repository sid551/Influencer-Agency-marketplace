import type { ApplicationStatus, CampaignStatus } from "@/types/campaign.types";
import type {
  CollaborationStatus,
  DeliverableStatus,
} from "@/types/collaboration.types";
import type {
  SocialVerificationStatus,
  VerificationStatus,
} from "@/types/creator.types";

/**
 * Shared, plain-English labels for the enum values stored in the database.
 * Using one map everywhere keeps statuses consistent between the creator
 * and business sides of the marketplace.
 */
const LABELS: Record<string, string> = {
  // Campaigns
  draft: "Draft",
  published: "Open for applications",
  active: "In progress",
  paused: "Paused",
  closed: "Closed",
  completed: "Completed",
  paid: "Paid collaboration",
  ugc: "UGC content",
  affiliate: "Affiliate",
  product_seeding: "Product seeding",
  sponsorship: "Sponsorship",
  contest: "Contest",
  barter: "Barter (product swap)",

  // Applications
  pending: "Pending review",
  accepted: "In negotiation",
  finalized: "Selected",
  rejected: "Not selected",
  withdrawn: "Withdrawn",

  // Collaborations
  negotiating: "Negotiating terms",
  agreement_pending: "Waiting for agreement",
  in_progress: "In progress",
  submitted: "Work submitted",
  revision_requested: "Changes requested",
  approved: "Approved",
  cancelled: "Cancelled",
  disputed: "Disputed",
  not_started: "Not started",

  // Verification
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

/** Human-readable label for a database enum value. */
export function label(value: string | null | undefined): string {
  if (!value) return "Not set";
  if (LABELS[value]) return LABELS[value];
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Short explanation of what a campaign status means for the owner. */
export const CAMPAIGN_STATUS_HELP: Record<CampaignStatus, string> = {
  draft: "Only you can see it. Publish when it is ready.",
  published: "Creators can find it and apply.",
  active: "You have selected a creator and work has begun.",
  paused: "Hidden from discovery for now.",
  closed: "No longer accepting applications.",
  completed: "All work is finished.",
};

/** Short explanation of what each application status means for a creator. */
/** Short "what happens next" copy for collaboration statuses. */
export const COLLABORATION_STATUS_HELP: Record<CollaborationStatus, string> = {
  negotiating: "Agree on price and deliverables in messages, then send the agreement.",
  agreement_pending: "The agreement is waiting for the other side to accept it.",
  active: "Work on the agreed deliverables and submit links when they're ready.",
  submitted: "The work is submitted and waiting for review.",
  revision_requested: "Changes were requested. Update the work and submit it again.",
  approved: "The work is approved. Mark the collaboration complete when everything is delivered.",
  completed: "Everything is done. You can still review the conversation any time.",
  cancelled: "This collaboration was cancelled.",
  disputed: "A problem was reported. Use messages to resolve it.",
};

export const APPLICATION_STATUS_HELP: Record<ApplicationStatus, string> = {
  pending: "The brand hasn't reviewed your proposal yet.",
  accepted: "The brand wants to work with you. Open messages to agree on the details.",
  finalized: "You've been selected. Continue in messages to agree on the work.",
  rejected: "The brand moved on this time. You can apply to other campaigns.",
  withdrawn: "You withdrew this application.",
};

export function campaignStatusLabel(status: CampaignStatus): string {
  return label(status);
}

export function applicationStatusLabel(status: ApplicationStatus): string {
  return label(status);
}

export function collaborationStatusLabel(status: CollaborationStatus): string {
  return label(status);
}

export function deliverableStatusLabel(status: DeliverableStatus): string {
  return label(status);
}

export function verificationStatusLabel(
  status: SocialVerificationStatus | VerificationStatus,
): string {
  return label(status);
}
