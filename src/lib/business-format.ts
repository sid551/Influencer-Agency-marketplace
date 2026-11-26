import type { ApplicationStatus } from "@/types/campaign.types";
import type { CollaborationStatus } from "@/types/collaboration.types";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline";

/** Shared badge styling for application statuses in the business area. */
export function applicationStatusVariant(status: ApplicationStatus): BadgeVariant {
  if (status === "accepted" || status === "shortlisted") return "default";
  if (status === "rejected") return "destructive";
  if (status === "withdrawn") return "secondary";
  return "outline";
}

/** Shared badge styling for collaboration statuses in the business area. */
export function collaborationStatusVariant(status: CollaborationStatus): BadgeVariant {
  if (status === "active" || status === "approved") return "default";
  if (status === "completed") return "secondary";
  if (status === "cancelled" || status === "disputed") return "destructive";
  return "outline";
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

export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
