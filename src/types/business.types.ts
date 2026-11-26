import type {
  ApplicationStatus,
  CampaignStatus,
  CollaborationRequest,
  CollaborationRequestStatus,
} from "./campaign.types";
import type {
  CollaborationListItem,
  CollaborationStatus,
  Conversation,
  Message,
} from "./collaboration.types";
import type { CreatorDirectoryEntry } from "./creator.types";

/** Public-safe creator summary shown next to applications and invitations. */
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
  campaign: { id: string; title: string; status: CampaignStatus } | null;
  creator: BusinessCreator | null;
}

/** An invitation sent by the signed-in business. */
export interface BusinessInvitation extends CollaborationRequest {
  status: CollaborationRequestStatus;
  campaign: { id: string; title: string } | null;
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
  collaboration: {
    id: string;
    status: CollaborationStatus;
    creator: BusinessCreator | null;
    campaign: { id: string; title: string } | null;
  } | null;
  lastMessage: Message | null;
  unreadCount: number;
}

/** A business-owned thread plus its collaboration context. */
export interface BusinessConversationDetail {
  conversation: Conversation;
  collaboration: {
    id: string;
    status: CollaborationStatus;
    creator: BusinessCreator | null;
    campaign: { id: string; title: string } | null;
  };
}
