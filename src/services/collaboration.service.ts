import "server-only";

import { createClient } from "@/lib/supabase/server";
import { ServiceResult } from "./profile.service";
import type { Json } from "@/types/database.types";
import type {
  Collaboration,
  CollaborationDetail,
  CollaborationInvitation,
  CollaborationListItem,
  CollaborationStatus,
  Deliverable,
} from "@/types/collaboration.types";
import type { CollaborationRequest } from "@/types/campaign.types";
import { CREATOR_COLLABORATION_TRANSITIONS } from "@/types/collaboration.types";

interface BusinessJoin {
  company_name: string | null;
  industry?: string | null;
  avatar_url: string | null;
}

type CollaborationRow = Omit<Collaboration, "deliverables"> & {
  deliverables: unknown;
  business_profiles: BusinessJoin | null;
  campaigns: { id: string; title: string } | null;
};

type RequestRow = CollaborationRequest & {
  business_profiles: BusinessJoin | null;
  campaigns: { id: string; title: string } | null;
};

/** collaborations.deliverables is untyped jsonb in the generated types. */
function parseDeliverables(value: unknown): Deliverable[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Deliverable =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as Deliverable).id === "string" &&
      typeof (item as Deliverable).title === "string",
  );
}

function toCollaboration(row: CollaborationRow): Collaboration {
  return {
    id: row.id,
    campaign_id: row.campaign_id,
    application_id: row.application_id,
    creator_profile_id: row.creator_profile_id,
    business_profile_id: row.business_profile_id,
    status: row.status as Collaboration["status"],
    agreed_price: row.agreed_price,
    currency: row.currency,
    terms: row.terms,
    deliverables: parseDeliverables(row.deliverables),
    revision_notes: row.revision_notes,
    deadline: row.deadline,
    submitted_at: row.submitted_at,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Map conversation ids onto collaborations for list views. */
async function conversationIdsFor(
  collaborationIds: string[],
): Promise<Map<string, string>> {
  if (collaborationIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("id, collaboration_id")
    .in("collaboration_id", collaborationIds);
  if (error || !data) return new Map();
  return new Map(data.map((row) => [row.collaboration_id, row.id]));
}

/** The signed-in creator's collaborations, newest first. */
export async function listOwnCollaborations(
  userId: string,
): Promise<CollaborationListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collaborations")
    .select(
      `*,
      business_profiles ( company_name, industry, avatar_url ),
      campaigns ( id, title )`,
    )
    .eq("creator_profile_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const rows = data as unknown as CollaborationRow[];
  const conversations = await conversationIdsFor(rows.map((row) => row.id));

  return rows.map((row) => {
    const { business_profiles, campaigns, ...collaboration } = row;
    return {
      ...collaboration,
      deliverables: parseDeliverables(row.deliverables),
      creator: null,
      business: business_profiles
        ? {
            profile_id: collaboration.business_profile_id,
            company_name: business_profiles.company_name,
            avatar_url: business_profiles.avatar_url,
          }
        : null,
      campaign: campaigns,
      conversation_id: conversations.get(row.id) ?? null,
    };
  });
}

/** A single creator-owned collaboration, including its message thread id. */
export async function getCollaborationForCreator(
  userId: string,
  collaborationId: string,
): Promise<CollaborationDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collaborations")
    .select(
      `*,
      business_profiles ( company_name, industry, avatar_url ),
      campaigns ( id, title )`,
    )
    .eq("id", collaborationId)
    .eq("creator_profile_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as CollaborationRow;
  const { business_profiles, campaigns, ...collaboration } = row;
  const conversations = await conversationIdsFor([row.id]);

  return {
    ...collaboration,
    deliverables: parseDeliverables(row.deliverables),
    creator: null,
    business: business_profiles
      ? {
          profile_id: collaboration.business_profile_id,
          company_name: business_profiles.company_name,
          avatar_url: business_profiles.avatar_url,
        }
      : null,
    campaign: campaigns,
    conversation_id: conversations.get(row.id) ?? null,
    conversationId: conversations.get(row.id) ?? null,
  };
}

/** Pending invitations addressed to the signed-in creator. */
export async function listIncomingInvitations(
  userId: string,
): Promise<CollaborationInvitation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collaboration_requests")
    .select(
      `*,
      business_profiles ( company_name, industry, avatar_url ),
      campaigns ( id, title )`,
    )
    .eq("creator_profile_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as unknown as RequestRow[]).map((row) => {
    const { business_profiles, campaigns, ...request } = row;
    return {
      ...request,
      business: business_profiles
        ? {
            company_name: business_profiles.company_name,
            industry: business_profiles.industry ?? null,
            avatar_url: business_profiles.avatar_url,
          }
        : null,
      campaign: campaigns,
    };
  });
}

/** Creator responds to a pending invitation. RLS limits this to their own
 *  pending requests; accepting also opens a collaboration via DB trigger. */
export async function respondToInvitation(
  userId: string,
  requestId: string,
  decision: "accepted" | "declined",
): Promise<ServiceResult<{ id: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collaboration_requests")
    .update({ status: decision })
    .eq("id", requestId)
    .eq("creator_profile_id", userId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      message: "That invitation is no longer available to respond to.",
    };
  }
  return { ok: true, data: { id: data.id } };
}

/** Editable collaboration fields during negotiation. */
export interface CollaborationTermsInput {
  terms: string | null;
  agreedPrice: number;
  currency: string;
  deadline: string | null;
}

export async function updateCollaborationTerms(
  userId: string,
  collaborationId: string,
  input: CollaborationTermsInput,
): Promise<ServiceResult<Collaboration>> {
  const supabase = await createClient();

  const { data: current, error: readError } = await supabase
    .from("collaborations")
    .select("status")
    .eq("id", collaborationId)
    .eq("creator_profile_id", userId)
    .maybeSingle();

  if (readError || !current) {
    return { ok: false, message: "Collaboration not found." };
  }
  if (current.status !== "negotiating" && current.status !== "agreement_pending") {
    return {
      ok: false,
      message: "Terms can only be edited while the agreement is being negotiated.",
    };
  }

  const { data, error } = await supabase
    .from("collaborations")
    .update({
      terms: input.terms,
      agreed_price: input.agreedPrice,
      currency: input.currency,
      deadline: input.deadline,
    })
    .eq("id", collaborationId)
    .eq("creator_profile_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, message: "Could not save the collaboration terms." };
  }

  return { ok: true, data: toCollaboration(data as unknown as CollaborationRow) };
}

/** Request a status change. The DB trigger rejects transitions that are not
 *  allowed for the creator, including any attempt to self-approve. */
export async function transitionCollaborationStatus(
  userId: string,
  collaborationId: string,
  nextStatus: CollaborationStatus,
): Promise<ServiceResult<Collaboration>> {
  const supabase = await createClient();

  const { data: current, error: readError } = await supabase
    .from("collaborations")
    .select("status")
    .eq("id", collaborationId)
    .eq("creator_profile_id", userId)
    .maybeSingle();

  if (readError || !current) {
    return { ok: false, message: "Collaboration not found." };
  }

  const allowed = CREATOR_COLLABORATION_TRANSITIONS[
    current.status as CollaborationStatus
  ];
  if (!allowed?.includes(nextStatus)) {
    return { ok: false, message: "That status change is not available." };
  }

  // submitted_at / completed_at are set by the database trigger — clients
  // no longer have column privileges to write workflow timestamps.
  const { data, error } = await supabase
    .from("collaborations")
    .update({ status: nextStatus })
    .eq("id", collaborationId)
    .eq("creator_profile_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, message: "Could not update the collaboration status." };
  }

  return { ok: true, data: toCollaboration(data as unknown as CollaborationRow) };
}

/** Mark one deliverable as submitted (with an optional asset link). */
export async function submitDeliverable(
  userId: string,
  collaborationId: string,
  deliverableId: string,
  assetUrl: string | null,
): Promise<ServiceResult<Deliverable>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collaborations")
    .select("status, deliverables")
    .eq("id", collaborationId)
    .eq("creator_profile_id", userId)
    .maybeSingle();

  if (error || !data) return { ok: false, message: "Collaboration not found." };

  const status = data.status as CollaborationStatus;
  if (!["active", "revision_requested", "submitted"].includes(status)) {
    return {
      ok: false,
      message: "Deliverables can only be submitted for an active collaboration.",
    };
  }

  const deliverables = parseDeliverables(data.deliverables);
  const index = deliverables.findIndex((item) => item.id === deliverableId);
  if (index === -1) {
    return { ok: false, message: "Deliverable not found." };
  }

  const updated: Deliverable = {
    ...deliverables[index],
    status: "submitted",
    asset_url: assetUrl ?? deliverables[index].asset_url,
  };
  deliverables[index] = updated;

  const { error: updateError } = await supabase
    .from("collaborations")
    .update({ deliverables: deliverables as unknown as Json })
    .eq("id", collaborationId)
    .eq("creator_profile_id", userId);

  if (updateError) {
    return { ok: false, message: "Could not update the deliverable." };
  }
  return { ok: true, data: updated };
}
