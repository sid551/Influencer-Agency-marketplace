import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getBusinessApplication } from "./business-application.service";
import { listBusinessCampaigns } from "./business-campaign.service";
import type { ServiceResult } from "./profile.service";
import type {
  BusinessCampaignApplicantThread,
  BusinessConversationDetail,
  BusinessMessageCampaign,
} from "@/types/business.types";
import {
  MESSAGEABLE_APPLICATION_STATUSES,
  type ApplicationStatus,
} from "@/types/campaign.types";
import type {
  CollaborationStatus,
  Conversation,
  ConversationCampaign,
  ConversationDetail,
  ConversationListItem,
  Message,
} from "@/types/collaboration.types";
import {
  creatorSummaries,
  type SupabaseClient,
} from "./business-collaboration.service";

/** Campaign join shared by every conversation header query. */
const CAMPAIGN_COLUMNS =
  "campaigns ( id, slug, title, description, budget_min, budget_max, currency, deliverables, platforms )";

interface ThreadCollaboration {
  id: string;
  status: string;
  agreed_price: number | null;
  currency: string;
  terms: string | null;
  deadline: string | null;
  business_profiles: {
    company_name: string | null;
  } | null;
  campaigns: ConversationCampaign | null;
}

type ConversationRow = Conversation & {
  collaborations: ThreadCollaboration | null;
};

interface BusinessThreadCollaboration {
  id: string;
  status: string;
  agreed_price: number | null;
  currency: string;
  terms: string | null;
  deadline: string | null;
  creator_profile_id: string;
  application_id: string | null;
  campaign_applications: { status: string } | null;
  campaigns: ConversationCampaign | null;
}

function toThreadHeader(collaboration: ThreadCollaboration): ConversationDetail["collaboration"] {
  return {
    id: collaboration.id,
    status: collaboration.status as ConversationDetail["collaboration"]["status"],
    agreed_price: collaboration.agreed_price,
    currency: collaboration.currency,
    terms: collaboration.terms,
    deadline: collaboration.deadline,
    business: collaboration.business_profiles
      ? {
          company_name: collaboration.business_profiles.company_name,
        }
      : null,
    campaign: collaboration.campaigns,
  };
}

/** Conversation ids for collaborations owned by this creator. */
async function ownCollaborationIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collaborations")
    .select("id")
    .eq("creator_profile_id", userId);
  if (error || !data) return [];
  return data.map((row) => row.id);
}

/** All messages for the given threads, grouped by conversation id. */
async function messagesForConversations(
  supabase: SupabaseClient,
  conversationIds: string[],
): Promise<Map<string, Message[]>> {
  const grouped = new Map<string, Message[]>();
  if (conversationIds.length === 0) return grouped;

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  if (error || !data) return grouped;
  for (const message of data as Message[]) {
    const list = grouped.get(message.conversation_id) ?? [];
    list.push(message);
    grouped.set(message.conversation_id, list);
  }
  return grouped;
}

/** Creator inbox: one row per conversation with its latest message and
 *  unread count. Messaging is only available on creator-owned threads. */
export async function listCreatorConversations(
  userId: string,
): Promise<ConversationListItem[]> {
  const collaborationIds = await ownCollaborationIds(userId);
  if (collaborationIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select(
      `id, collaboration_id, created_at, updated_at,
      collaborations!inner (
        id, status, agreed_price, currency, terms, deadline,
        business_profiles ( company_name ),
        ${CAMPAIGN_COLUMNS}
      )`,
    )
    .in("collaboration_id", collaborationIds)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];

  const rows = data as unknown as ConversationRow[];
  const messagesByConversation = await messagesForConversations(
    supabase,
    rows.map((row) => row.id),
  );

  return rows.map((row) => {
    const messages = messagesByConversation.get(row.id) ?? [];
    return {
      id: row.id,
      collaboration_id: row.collaboration_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      collaboration: row.collaborations ? toThreadHeader(row.collaborations) : null,
      lastMessage: messages[0] ?? null,
      unreadCount: messages.filter(
        (message) => message.read_at === null && message.sender_profile_id !== userId,
      ).length,
    };
  });
}

/** A single thread plus its creator-owned collaboration context. */
export async function getCreatorConversation(
  userId: string,
  conversationId: string,
): Promise<ConversationDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !data) return null;

  const { data: collaboration, error: collaborationError } = await supabase
    .from("collaborations")
    .select(
      `id, status, agreed_price, currency, terms, deadline,
      business_profiles ( company_name ),
      ${CAMPAIGN_COLUMNS}`,
    )
    .eq("id", data.collaboration_id)
    .eq("creator_profile_id", userId)
    .maybeSingle();

  if (collaborationError || !collaboration) return null;

  return {
    conversation: data as Conversation,
    collaboration: toThreadHeader(collaboration as unknown as ThreadCollaboration),
  };
}

/** Idempotently open the single thread attached to a collaboration. */
export async function getOrOpenConversation(
  userId: string,
  collaborationId: string,
): Promise<ServiceResult<Conversation>> {
  const supabase = await createClient();

  const { data: owned } = await supabase
    .from("collaborations")
    .select("id")
    .eq("id", collaborationId)
    .eq("creator_profile_id", userId)
    .maybeSingle();

  if (!owned) return { ok: false, message: "Collaboration not found." };

  const { data: existing, error: lookupError } = await supabase
    .from("conversations")
    .select("*")
    .eq("collaboration_id", collaborationId)
    .maybeSingle();

  if (lookupError) return { ok: false, message: "Could not open the conversation." };
  if (existing) return { ok: true, data: existing as Conversation };

  const { data: created, error: insertError } = await supabase
    .from("conversations")
    .insert({ collaboration_id: collaborationId, created_by: userId })
    .select("*")
    .single();

  if (insertError || !created) {
    // Another participant may have opened it at the same time.
    const { data: raced } = await supabase
      .from("conversations")
      .select("*")
      .eq("collaboration_id", collaborationId)
      .maybeSingle();
    if (raced) return { ok: true, data: raced as Conversation };
    return { ok: false, message: "Could not open the conversation." };
  }

  return { ok: true, data: created as Conversation };
}

/** Full thread history, oldest first. RLS limits it to participants. */
export async function listMessages(conversationId: string): Promise<Message[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as Message[];
}

/** Insert a message as the signed-in user. RLS enforces participation and
 *  forbids setting read_at from the sender. */
export async function sendMessage(input: {
  conversationId: string;
  senderProfileId: string;
  body: string;
}): Promise<ServiceResult<Message>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      sender_profile_id: input.senderProfileId,
      body: input.body,
      read_at: null,
    })
    .select("*")
    .single();

  if (error || !data) {
    if (error?.code === "42501") {
      return { ok: false, message: "You can't send messages in this conversation." };
    }
    return { ok: false, message: "Could not send your message." };
  }
  return { ok: true, data: data as Message };
}

/** Mark the other party's messages in a thread as read. */
export async function markConversationRead(
  userId: string,
  conversationId: string,
): Promise<ServiceResult<number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .is("read_at", null)
    .neq("sender_profile_id", userId)
    .select("id");

  if (error) return { ok: false, message: "Could not mark messages as read." };
  return { ok: true, data: data?.length ?? 0 };
}

/** Unread messages across all of the creator's conversations (for the nav). */
export async function countUnreadMessages(userId: string): Promise<number> {
  const collaborationIds = await ownCollaborationIds(userId);
  if (collaborationIds.length === 0) return 0;

  const supabase = await createClient();
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id")
    .in("collaboration_id", collaborationIds);
  if (!conversations?.length) return 0;

  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", conversations.map((row) => row.id))
    .is("read_at", null)
    .neq("sender_profile_id", userId);

  if (error) return 0;
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Business side. The same generic send/read functions above are used; only
// the ownership lookups differ (business_profile_id = signed-in user).
// ---------------------------------------------------------------------------

async function ownBusinessCollaborationIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collaborations")
    .select("id")
    .eq("business_profile_id", userId);
  if (error || !data) return [];
  return data.map((row) => row.id);
}

type CampaignApplicationRow = {
  id: string;
  campaign_id: string;
  creator_profile_id: string;
  proposal: string;
  expected_price: number;
  currency: string;
  status: string;
  created_at: string;
};

type MessageCollaborationRow = {
  id: string;
  campaign_id: string | null;
  application_id: string | null;
  creator_profile_id: string;
  status: string;
};

type MessageConversationRow = {
  id: string;
  collaboration_id: string;
  updated_at: string;
};

/** Campaign-wise business inbox: one card per owned campaign with the
 *  application count, accepted creator count and unread message total. */
export async function listBusinessMessageCampaigns(
  userId: string,
): Promise<BusinessMessageCampaign[]> {
  const campaigns = await listBusinessCampaigns(userId);
  if (campaigns.length === 0) return [];

  const supabase = await createClient();
  const campaignIds = campaigns.map((campaign) => campaign.id);
  const [applicationResult, collaborationResult] = await Promise.all([
    supabase
      .from("campaign_applications")
      .select("id, campaign_id, status")
      .in("campaign_id", campaignIds),
    supabase
      .from("collaborations")
      .select("id, campaign_id, application_id, creator_profile_id, status")
      .eq("business_profile_id", userId)
      .in("campaign_id", campaignIds),
  ]);

  const applications = (applicationResult.data ?? []) as Array<{
    id: string;
    campaign_id: string;
    status: string;
  }>;
  const collaborations = (collaborationResult.data ?? []) as MessageCollaborationRow[];
  const collaborationIds = collaborations.map((row) => row.id);

  const conversationRows: MessageConversationRow[] = collaborationIds.length
    ? ((await supabase
        .from("conversations")
        .select("id, collaboration_id, updated_at")
        .in("collaboration_id", collaborationIds)).data ?? []) as MessageConversationRow[]
    : [];

  const messagesByConversation = await messagesForConversations(
    supabase,
    conversationRows.map((row) => row.id),
  );
  const collaborationIdsByConversation = new Map(
    conversationRows.map((row) => [row.id, row.collaboration_id]),
  );

  return campaigns.map((campaign) => {
    const campaignApplications = applications.filter(
      (row) => row.campaign_id === campaign.id,
    );
    const campaignCollaborations = collaborations.filter(
      (row) => row.campaign_id === campaign.id,
    );
    const campaignConversations = conversationRows.filter((row) => {
      const collaborationId = collaborationIdsByConversation.get(row.id);
      return campaignCollaborations.some((item) => item.id === collaborationId);
    });

    const messages = campaignConversations.flatMap(
      (row) => messagesByConversation.get(row.id) ?? [],
    );
    messages.sort((a, b) => b.created_at.localeCompare(a.created_at));

    const activity = campaignConversations
      .map((row) => row.updated_at)
      .sort((a, b) => b.localeCompare(a));

    return {
      id: campaign.id,
      slug: campaign.slug,
      title: campaign.title,
      status: campaign.status,
      applicationCount: campaignApplications.length,
      acceptedCount: campaignApplications.filter((row) =>
        MESSAGEABLE_APPLICATION_STATUSES.includes(
          row.status as (typeof MESSAGEABLE_APPLICATION_STATUSES)[number],
        ),
      ).length,
      unreadCount: messages.filter(
        (message) =>
          message.read_at === null && message.sender_profile_id !== userId,
      ).length,
      lastActivityAt: activity[0] ?? null,
      lastMessage: messages[0] ?? null,
    };
  });
}

/** Applicants for one owned campaign, with their collaboration thread when
 *  the application has been accepted and a conversation has been opened. */
export async function listCampaignApplicantConversations(
  userId: string,
  campaignId: string,
  status: ApplicationStatus | "all" = "all",
): Promise<BusinessCampaignApplicantThread[]> {
  const supabase = await createClient();
  let query = supabase
    .from("campaign_applications")
    .select(
      `id, campaign_id, creator_profile_id, proposal, expected_price, currency,
      status, created_at, campaigns!inner ( id )`,
    )
    .eq("campaign_id", campaignId)
    .eq("campaigns.business_profile_id", userId)
    .order("created_at", { ascending: false });
  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error || !data) return [];

  const applications = data as unknown as CampaignApplicationRow[];
  if (applications.length === 0) return [];

  const applicationIds = applications.map((row) => row.id);
  const { data: collaborationRows } = await supabase
    .from("collaborations")
    .select("id, campaign_id, application_id, creator_profile_id, status")
    .eq("business_profile_id", userId)
    .eq("campaign_id", campaignId)
    .in("application_id", applicationIds);
  const collaborations = (collaborationRows ?? []) as MessageCollaborationRow[];

  const conversationRows: MessageConversationRow[] = collaborations.length
    ? ((await supabase
        .from("conversations")
        .select("id, collaboration_id, updated_at")
        .in("collaboration_id", collaborations.map((row) => row.id))).data ??
      []) as MessageConversationRow[]
    : [];

  const [messagesByConversation, creators] = await Promise.all([
    messagesForConversations(
      supabase,
      conversationRows.map((row) => row.id),
    ),
    creatorSummaries(
      supabase,
      [...new Set(applications.map((row) => row.creator_profile_id))],
    ),
  ]);
  const conversationByCollaboration = new Map(
    conversationRows.map((row) => [row.collaboration_id, row]),
  );
  const collaborationByApplication = new Map(
    collaborations
      .filter((row): row is MessageCollaborationRow & { application_id: string } =>
        Boolean(row.application_id),
      )
      .map((row) => [row.application_id, row]),
  );

  return applications.map((application) => {
    const collaboration = collaborationByApplication.get(application.id) ?? null;
    const conversation = collaboration
      ? (conversationByCollaboration.get(collaboration.id) ?? null)
      : null;
    const messages = conversation
      ? (messagesByConversation.get(conversation.id) ?? [])
      : [];
    return {
      applicationId: application.id,
      campaignId: application.campaign_id,
      creator: creators.get(application.creator_profile_id) ?? null,
      applicationStatus: application.status as ApplicationStatus,
      proposal: application.proposal,
      expectedPrice: application.expected_price,
      currency: application.currency,
      appliedAt: application.created_at,
      collaborationId: collaboration?.id ?? null,
      collaborationStatus:
        (collaboration?.status as CollaborationStatus | undefined) ?? null,
      conversationId: conversation?.id ?? null,
      lastMessage: messages[0] ?? null,
      unreadCount: messages.filter(
        (message) =>
          message.read_at === null && message.sender_profile_id !== userId,
      ).length,
      updatedAt: conversation?.updated_at ?? null,
    };
  });
}

/** A single business-owned thread with the creator's display details. */
export async function getBusinessConversation(
  userId: string,
  conversationId: string,
): Promise<BusinessConversationDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !data) return null;

  const { data: collaboration, error: collaborationError } = await supabase
    .from("collaborations")
    .select(
      `id, status, agreed_price, currency, terms, deadline, creator_profile_id,
      application_id, campaign_applications ( status ),
      ${CAMPAIGN_COLUMNS}`,
    )
    .eq("id", data.collaboration_id)
    .eq("business_profile_id", userId)
    .maybeSingle();

  if (collaborationError || !collaboration) return null;

  const row = collaboration as unknown as BusinessThreadCollaboration;
  const creators = await creatorSummaries(supabase, [row.creator_profile_id]);

  return {
    conversation: data as Conversation,
    collaboration: {
      id: row.id,
      status: row.status as CollaborationStatus,
      agreed_price: row.agreed_price,
      currency: row.currency,
      terms: row.terms,
      deadline: row.deadline,
      creator: creators.get(row.creator_profile_id) ?? null,
      applicationId: row.application_id,
      applicationStatus:
        (row.campaign_applications?.status as ApplicationStatus | undefined) ??
        null,
      campaign: row.campaigns,
    },
  };
}

/** Idempotently open the single thread attached to a business collaboration. */
export async function getOrOpenBusinessConversation(
  userId: string,
  collaborationId: string,
): Promise<ServiceResult<Conversation>> {
  const supabase = await createClient();

  const { data: owned } = await supabase
    .from("collaborations")
    .select("id")
    .eq("id", collaborationId)
    .eq("business_profile_id", userId)
    .maybeSingle();

  if (!owned) return { ok: false, message: "Collaboration not found." };

  const { data: existing, error: lookupError } = await supabase
    .from("conversations")
    .select("*")
    .eq("collaboration_id", collaborationId)
    .maybeSingle();

  if (lookupError) return { ok: false, message: "Could not open the conversation." };
  if (existing) return { ok: true, data: existing as Conversation };

  const { data: created, error: insertError } = await supabase
    .from("conversations")
    .insert({ collaboration_id: collaborationId, created_by: userId })
    .select("*")
    .single();

  if (insertError || !created) {
    // Another participant may have opened it at the same time.
    const { data: raced } = await supabase
      .from("conversations")
      .select("*")
      .eq("collaboration_id", collaborationId)
      .maybeSingle();
    if (raced) return { ok: true, data: raced as Conversation };
    return { ok: false, message: "Could not open the conversation." };
  }

  return { ok: true, data: created as Conversation };
}

/** Open (or reuse) the thread for an accepted application. The migration's
 *  trigger normally creates it; this is the lazy fallback for older rows. */
export async function getOrOpenApplicationConversation(
  userId: string,
  applicationId: string,
): Promise<ServiceResult<Conversation>> {
  const application = await getBusinessApplication(userId, applicationId);
  if (!application) return { ok: false, message: "Application not found." };
  if (
    !MESSAGEABLE_APPLICATION_STATUSES.includes(
      application.status as (typeof MESSAGEABLE_APPLICATION_STATUSES)[number],
    )
  ) {
    return {
      ok: false,
      message: "Only creators in an active negotiation can be messaged.",
    };
  }

  const supabase = await createClient();
  const { data: collaboration } = await supabase
    .from("collaborations")
    .select("id")
    .eq("application_id", applicationId)
    .eq("business_profile_id", userId)
    .maybeSingle();
  if (!collaboration) {
    return { ok: false, message: "Collaboration not found for this application." };
  }

  return getOrOpenBusinessConversation(userId, collaboration.id);
}

/** Unread messages across all business-owned threads (for the nav). */
export async function countUnreadBusinessMessages(userId: string): Promise<number> {
  const collaborationIds = await ownBusinessCollaborationIds(userId);
  if (collaborationIds.length === 0) return 0;

  const supabase = await createClient();
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id")
    .in("collaboration_id", collaborationIds);
  if (!conversations?.length) return 0;

  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", conversations.map((row) => row.id))
    .is("read_at", null)
    .neq("sender_profile_id", userId);

  if (error) return 0;
  return count ?? 0;
}
