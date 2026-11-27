// =============================================================
// Collaboration, messaging, notification & review domain types.
// Status/enum unions mirror the CHECK constraints in
// supabase/migrations/20261125000001_initial_schema.sql.
// =============================================================

export const COLLABORATION_STATUSES = [
  "negotiating",
  "agreement_pending",
  "active",
  "submitted",
  "revision_requested",
  "approved",
  "completed",
  "cancelled",
  "disputed",
] as const;
export type CollaborationStatus = (typeof COLLABORATION_STATUSES)[number];

/** Status changes a creator is allowed to request. The database trigger
 *  in migration 0002 remains the final authority for these transitions. */
export const CREATOR_COLLABORATION_TRANSITIONS: Record<
  CollaborationStatus,
  CollaborationStatus[]
> = {
  negotiating: ["agreement_pending", "cancelled"],
  agreement_pending: ["negotiating", "active", "cancelled"],
  active: ["submitted", "disputed"],
  submitted: ["disputed"],
  revision_requested: ["submitted", "disputed"],
  approved: ["completed"],
  completed: [],
  cancelled: [],
  disputed: [],
};

/** Status changes a business is allowed to request. The database trigger
 *  in migration 0002 remains the final authority for these transitions. */
export const BUSINESS_COLLABORATION_TRANSITIONS: Record<
  CollaborationStatus,
  CollaborationStatus[]
> = {
  negotiating: ["agreement_pending", "cancelled"],
  agreement_pending: ["negotiating", "active", "cancelled"],
  active: ["disputed"],
  submitted: ["approved", "revision_requested", "disputed"],
  revision_requested: ["disputed"],
  approved: ["completed", "disputed"],
  completed: [],
  cancelled: [],
  disputed: [],
};

export const DELIVERABLE_STATUSES = ["pending", "submitted", "approved"] as const;
export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number];

/**
 * An agreed deliverable inside collaborations.deliverables (jsonb).
 */
export interface Deliverable {
  id: string;
  title: string;
  due_date: string | null;
  status: DeliverableStatus;
  asset_url: string | null;
}

/** Row type for public.collaborations. */
export interface Collaboration {
  id: string;
  campaign_id: string | null;
  application_id: string | null;
  creator_profile_id: string;
  business_profile_id: string;
  status: CollaborationStatus;
  agreed_price: number | null;
  currency: string;
  terms: string | null;
  deliverables: Deliverable[];
  revision_notes: string | null;
  deadline: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Collaboration joined with display info for list views. */
export interface CollaborationWithParties extends Collaboration {
  creator: {
    profile_id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  business: {
    profile_id: string;
    company_name: string | null;
  } | null;
}

/** Row type for public.conversations. */
export interface Conversation {
  id: string;
  collaboration_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** Row type for public.messages. */
export interface Message {
  id: string;
  conversation_id: string;
  sender_profile_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

/** Collaboration row with the joins used by creator-facing list/detail views. */
export interface CollaborationListItem extends CollaborationWithParties {
  campaign: { id: string; title: string } | null;
  conversation_id: string | null;
}

/** Detail view: a collaboration plus its message thread id (if opened). */
export interface CollaborationDetail extends CollaborationListItem {
  conversationId: string | null;
}

/** Campaign summary carried by conversation headers so the thread can show
 *  the business's goals (brief, deliverables, budget) next to the messages. */
export interface ConversationCampaign {
  id: string;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  deliverables: string[];
  platforms: string[];
}

/** Negotiated-price context every conversation header shares, regardless of
 *  which side of the collaboration is reading it. */
export interface ConversationCollaboration {
  id: string;
  status: CollaborationStatus;
  agreed_price: number | null;
  currency: string;
  terms: string | null;
  deadline: string | null;
  campaign: ConversationCampaign | null;
}

/** Conversation thread header shown to the creator. */
export interface ConversationListItem {
  id: string;
  collaboration_id: string;
  created_at: string;
  updated_at: string;
  collaboration:
    | (ConversationCollaboration & {
        business: {
          company_name: string | null;
        } | null;
      })
    | null;
  lastMessage: Message | null;
  unreadCount: number;
}

/** A conversation plus the creator-owned collaboration it belongs to. */
export interface ConversationDetail {
  conversation: Conversation;
  collaboration: ConversationCollaboration & {
    business: {
      company_name: string | null;
    } | null;
  };
}

export const NOTIFICATION_TYPES = [
  "application_status",
  "message",
  "deadline",
  "revision_request",
  "approval",
  "completion",
  "system",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Row type for public.notifications. */
export interface Notification {
  id: string;
  profile_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link_path: string | null;
  read_at: string | null;
  created_at: string;
}

/** Row type for public.reviews. */
export interface Review {
  id: string;
  collaboration_id: string;
  reviewer_profile_id: string;
  reviewee_profile_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}
