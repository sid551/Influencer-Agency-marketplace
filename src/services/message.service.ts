import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ServiceResult } from "./profile.service";
import type {
  Conversation,
  ConversationDetail,
  ConversationListItem,
  Message,
} from "@/types/collaboration.types";

interface ThreadCollaboration {
  id: string;
  status: string;
  business_profiles: {
    company_name: string | null;
    avatar_url: string | null;
  } | null;
  campaigns: { id: string; title: string } | null;
}

type ConversationRow = Conversation & {
  collaborations: ThreadCollaboration | null;
};

function toThreadHeader(collaboration: ThreadCollaboration): ConversationDetail["collaboration"] {
  return {
    id: collaboration.id,
    status: collaboration.status as ConversationDetail["collaboration"]["status"],
    business: collaboration.business_profiles
      ? {
          company_name: collaboration.business_profiles.company_name,
          avatar_url: collaboration.business_profiles.avatar_url,
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
        id, status,
        business_profiles ( company_name, avatar_url ),
        campaigns ( id, title )
      )`,
    )
    .in("collaboration_id", collaborationIds)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];

  const rows = data as unknown as ConversationRow[];
  const conversationIds = rows.map((row) => row.id);
  const { data: allMessages } = await supabase
    .from("messages")
    .select("*")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  const messagesByConversation = new Map<string, Message[]>();
  for (const message of (allMessages ?? []) as Message[]) {
    const list = messagesByConversation.get(message.conversation_id) ?? [];
    list.push(message);
    messagesByConversation.set(message.conversation_id, list);
  }

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
      `id, status,
      business_profiles ( company_name, avatar_url ),
      campaigns ( id, title )`,
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
