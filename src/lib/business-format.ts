import { formatMoney } from "@/lib/money";
import {
  simpleApplicationStatus,
  simpleCampaignStatus,
  simpleCollaborationStatus,
} from "@/lib/labels";
import type { ApplicationStatus, CampaignStatus } from "@/types/campaign.types";
import type { CollaborationStatus } from "@/types/collaboration.types";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline";

/** Shared badge styling for application statuses. */
export function applicationStatusVariant(status: ApplicationStatus): BadgeVariant {
  switch (simpleApplicationStatus(status)) {
    case "new":
      return "default";
    case "in_talks":
      return "secondary";
    case "selected":
      return "default";
    default:
      return "outline";
  }
}

/** Shared badge styling for campaign statuses. */
export function campaignStatusVariant(status: CampaignStatus): BadgeVariant {
  switch (simpleCampaignStatus(status)) {
    case "live":
      return "default";
    case "draft":
      return "outline";
    default:
      return "secondary";
  }
}

/** Shared badge styling for collaboration statuses. */
export function collaborationStatusVariant(status: CollaborationStatus): BadgeVariant {
  switch (simpleCollaborationStatus(status)) {
    case "needs_attention":
      return "destructive";
    case "in_progress":
      return "default";
    case "done":
      return "secondary";
    default:
      return "outline";
  }
}

/** Collaboration dates are stored as ISO timestamps or YYYY-MM-DD strings. */
export function formatDate(value: string | null): string {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Backwards-compatible name for the shared INR money formatter. */
export function formatPrice(amount: number, currency: string): string {
  return formatMoney(amount, currency);
}
