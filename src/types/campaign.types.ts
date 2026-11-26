// =============================================================
// Campaign & application domain types.
// Status/enum unions mirror the CHECK constraints in
// supabase/migrations/20261125000001_initial_schema.sql.
// =============================================================

export const CAMPAIGN_STATUSES = [
  "draft",
  "published",
  "active",
  "paused",
  "closed",
  "completed",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/** Statuses visible in creator campaign discovery. */
export const DISCOVERABLE_CAMPAIGN_STATUSES = ["published", "active"] as const;
export type DiscoverableCampaignStatus =
  (typeof DISCOVERABLE_CAMPAIGN_STATUSES)[number];

export const COLLABORATION_TYPES = [
  "paid",
  "ugc",
  "affiliate",
  "product_seeding",
  "sponsorship",
  "contest",
] as const;
export type CollaborationType = (typeof COLLABORATION_TYPES)[number];

export const APPLICATION_STATUSES = [
  "pending",
  "shortlisted",
  "accepted",
  "rejected",
  "withdrawn",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Decisions a business may make on an application. Mirrors the database
 *  trigger in migration 0002, which remains the final authority. */
export type BusinessApplicationDecision = Extract<
  ApplicationStatus,
  "shortlisted" | "accepted" | "rejected"
>;

export const BUSINESS_APPLICATION_TRANSITIONS: Record<
  ApplicationStatus,
  BusinessApplicationDecision[]
> = {
  pending: ["shortlisted", "accepted", "rejected"],
  shortlisted: ["accepted", "rejected"],
  accepted: [],
  rejected: [],
  withdrawn: [],
};

export const COLLABORATION_REQUEST_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "expired",
  "cancelled",
] as const;
export type CollaborationRequestStatus =
  (typeof COLLABORATION_REQUEST_STATUSES)[number];

/** Row type for public.campaigns. */
export interface Campaign {
  id: string;
  business_profile_id: string;
  title: string;
  description: string;
  category: string;
  platforms: string[];
  collaboration_type: CollaborationType;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  deliverables: string[];
  application_deadline: string | null;
  location: string | null;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
}

/** Campaign joined with its business for display on cards. */
export interface CampaignWithBusiness extends Campaign {
  business: {
    company_name: string;
    website: string | null;
    industry: string | null;
  } | null;
}

/** Row type for public.campaign_applications. */
export interface CampaignApplication {
  id: string;
  campaign_id: string;
  creator_profile_id: string;
  proposal: string;
  why_suitable: string | null;
  expected_price: number;
  currency: string;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
}

/** Application joined with its campaign for the creator's list. */
export interface ApplicationWithCampaign extends CampaignApplication {
  campaign: Pick<
    Campaign,
    "id" | "title" | "category" | "platforms" | "application_deadline" | "status"
  > | null;
}

/** Row type for public.collaboration_requests (invitations). */
export interface CollaborationRequest {
  id: string;
  campaign_id: string | null;
  creator_profile_id: string;
  business_profile_id: string;
  message: string | null;
  status: CollaborationRequestStatus;
  created_at: string;
  updated_at: string;
}

/** Filter state for campaign discovery (URL search params). */
export interface CampaignFilters {
  category?: string;
  platform?: string;
  location?: string;
  budgetMin?: number;
  budgetMax?: number;
  collaborationType?: CollaborationType;
  status?: DiscoverableCampaignStatus;
}
