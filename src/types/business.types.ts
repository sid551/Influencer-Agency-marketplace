import type {
  ApplicationStatus,
  Campaign,
  CampaignStatus,
} from "./campaign.types";
import type {
  CollaborationListItem,
  CollaborationStatus,
  Conversation,
  ConversationCollaboration,
  Message,
} from "./collaboration.types";
import type { CreatorDirectoryEntry } from "./creator.types";

/** Public-safe creator summary shown next to applications and collaborations. */
export type BusinessCreator = Pick<
  CreatorDirectoryEntry,
  "profile_id" | "full_name" | "username" | "avatar_url" | "city" | "state" | "niches"
>;

/** An application to one of the signed-in business's campaigns. */
export interface BusinessApplication {
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
  campaign: {
    id: string;
    slug: string;
    title: string;
    status: CampaignStatus;
  } | null;
  creator: BusinessCreator | null;
}

/** A collaboration owned by the signed-in business, with the creator's
 *  public directory details and the linked conversation id. */
export interface BusinessCollaboration
  extends Omit<CollaborationListItem, "creator" | "business"> {
  creator: BusinessCreator | null;
  conversationId: string | null;
}

/** One business-owned thread with the creator shown on the other side. */
export interface BusinessConversationListItem {
  id: string;
  collaboration_id: string;
  created_at: string;
  updated_at: string;
  collaboration:
    | (ConversationCollaboration & {
        creator: BusinessCreator | null;
      })
    | null;
  lastMessage: Message | null;
  unreadCount: number;
}

/** A business-owned thread plus its collaboration and application context. */
export interface BusinessConversationDetail {
  conversation: Conversation;
  collaboration: ConversationCollaboration & {
    creator: BusinessCreator | null;
    applicationId: string | null;
    applicationStatus: ApplicationStatus | null;
  };
}

/** A campaign shown in the business's campaign-wise message inbox. */
export interface BusinessMessageCampaign {
  id: string;
  slug: string;
  title: string;
  status: CampaignStatus;
  applicationCount: number;
  acceptedCount: number;
  unreadCount: number;
  lastActivityAt: string | null;
  lastMessage: Message | null;
}

/** A creator/applicant shown inside one campaign's message inbox. */
export interface BusinessCampaignApplicantThread {
  applicationId: string;
  campaignId: string;
  creator: BusinessCreator | null;
  applicationStatus: ApplicationStatus;
  proposal: string;
  expectedPrice: number;
  currency: string;
  appliedAt: string;
  collaborationId: string | null;
  collaborationStatus: CollaborationStatus | null;
  conversationId: string | null;
  lastMessage: Message | null;
  unreadCount: number;
  updatedAt: string | null;
}

/** One owned campaign with its own application count. */
export interface BusinessCampaignDashboardItem {
  campaign: Campaign;
  applicationCount: number;
}
