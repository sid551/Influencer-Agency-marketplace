import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { BusinessDeliverableDraftValues } from "@/lib/validations/business";
import type {
  BusinessCollaboration,
  BusinessCreator,
} from "@/types/business.types";
import type {
  Collaboration,
  CollaborationStatus,
  Deliverable,
} from "@/types/collaboration.types";
import {
  BUSINESS_COLLABORATION_TRANSITIONS,
} from "@/types/collaboration.types";
import type { Json } from "@/types/database.types";
import type { CreatorDirectoryEntry } from "@/types/creator.types";
import type { ServiceResult } from "./profile.service";

const CREATOR_COLUMNS =
  "profile_id, full_name, username, avatar_url, city, state, niches";

export type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type CollaborationRow = Omit<Collaboration, "deliverables"> & {
  deliverables: unknown;
  campaigns: { id: string; title: string } | null;
};

type CreatorRow = Pick<
  CreatorDirectoryEntry,
  "profile_id" | "full_name" | "username" | "avatar_url" | "city" | "state" | "niches"
>;

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

/** Public-safe creator summaries for the supplied profile IDs. */
export async function creatorSummaries(
  supabase: SupabaseClient,
  creatorIds: string[],
): Promise<Map<string, BusinessCreator>> {
  if (creatorIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("creator_directory")
    .select(CREATOR_COLUMNS)
    .in("profile_id", creatorIds);
  if (error || !data) return new Map();

  const entries = data as unknown as CreatorRow[];
  return new Map(
    entries.map((entry) => [
      entry.profile_id,
      {
        profile_id: entry.profile_id,
        full_name: entry.full_name,
        username: entry.username,
        avatar_url: entry.avatar_url,
        city: entry.city,
        state: entry.state,
        niches: entry.niches ?? [],
      },
    ]),
  );
}

/** Map conversation ids onto collaborations for list/detail views. */
async function conversationIdsFor(
  supabase: SupabaseClient,
  collaborationIds: string[],
): Promise<Map<string, string>> {
  if (collaborationIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("conversations")
    .select("id, collaboration_id")
    .in("collaboration_id", collaborationIds);
  if (error || !data) return new Map();
  return new Map(data.map((row) => [row.collaboration_id, row.id]));
}

function toBusinessCollaboration(
  row: CollaborationRow,
  creators: Map<string, BusinessCreator>,
  conversations: Map<string, string>,
): BusinessCollaboration {
  const { campaigns, ...collaboration } = row;
  const conversationId = conversations.get(row.id) ?? null;
  return {
    ...collaboration,
    deliverables: parseDeliverables(row.deliverables),
    creator: creators.get(row.creator_profile_id) ?? null,
    campaign: campaigns,
    conversation_id: conversationId,
    conversationId,
  };
}

/** Applications the business has finally selected. Only these collaborations
 *  belong in the collaborations tab; the others are still negotiations. */
async function finalizedApplicationIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("campaign_applications")
    .select("id, campaigns!inner ( business_profile_id )")
    .eq("status", "finalized")
    .eq("campaigns.business_profile_id", userId);

  if (error || !data) return [];
  return (data as unknown as { id: string }[]).map((row) => row.id);
}

/** Finalized collaborations owned by the business, newest first. */
export async function listBusinessCollaborations(
  userId: string,
): Promise<BusinessCollaboration[]> {
  const supabase = await createClient();
  const applicationIds = await finalizedApplicationIds(supabase, userId);
  if (applicationIds.length === 0) return [];

  const { data, error } = await supabase
    .from("collaborations")
    .select(`*, campaigns ( id, title )`)
    .eq("business_profile_id", userId)
    .in("application_id", applicationIds)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  const rows = data as unknown as CollaborationRow[];
  const [creators, conversations] = await Promise.all([
    creatorSummaries(
      supabase,
      rows.map((row) => row.creator_profile_id),
    ),
    conversationIdsFor(
      supabase,
      rows.map((row) => row.id),
    ),
  ]);

  return rows.map((row) =>
    toBusinessCollaboration(row, creators, conversations),
  );
}

/** A single business-owned collaboration with creator display details. */
export async function getBusinessCollaboration(
  userId: string,
  collaborationId: string,
): Promise<BusinessCollaboration | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collaborations")
    .select(`*, campaigns ( id, title )`)
    .eq("id", collaborationId)
    .eq("business_profile_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as unknown as CollaborationRow;
  const [creators, conversations] = await Promise.all([
    creatorSummaries(supabase, [row.creator_profile_id]),
    conversationIdsFor(supabase, [row.id]),
  ]);

  return toBusinessCollaboration(row, creators, conversations);
}

/** Dashboard count of finalized collaborations only, matching the tab. */
export async function countBusinessCollaborations(
  userId: string,
): Promise<number> {
  const supabase = await createClient();
  const applicationIds = await finalizedApplicationIds(supabase, userId);
  if (applicationIds.length === 0) return 0;

  const { count, error } = await supabase
    .from("collaborations")
    .select("id", { count: "exact", head: true })
    .eq("business_profile_id", userId)
    .in("application_id", applicationIds);

  if (error) return 0;
  return count ?? 0;
}

/** Negotiable fields editable by either participant while the agreement is open. */
export interface BusinessCollaborationTermsInput {
  terms: string | null;
  agreedPrice: number;
  currency: string;
  deadline: string | null;
}

export async function updateBusinessCollaborationTerms(
  userId: string,
  collaborationId: string,
  input: BusinessCollaborationTermsInput,
): Promise<ServiceResult<Collaboration>> {
  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("collaborations")
    .select("status")
    .eq("id", collaborationId)
    .eq("business_profile_id", userId)
    .maybeSingle();

  if (readError || !current) {
    return { ok: false, message: "Collaboration not found." };
  }
  if (
    current.status !== "negotiating" &&
    current.status !== "agreement_pending"
  ) {
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
    .eq("business_profile_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, message: "Could not save the collaboration terms." };
  }

  return { ok: true, data: toCollaborationRow(data as unknown as CollaborationRow) };
}

/** Request a status change. The service mirrors the DB trigger so callers get
 *  a readable error; the trigger still rejects anything it does not allow. */
export async function transitionBusinessCollaborationStatus(
  userId: string,
  collaborationId: string,
  nextStatus: CollaborationStatus,
): Promise<ServiceResult<Collaboration>> {
  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("collaborations")
    .select("status, deliverables")
    .eq("id", collaborationId)
    .eq("business_profile_id", userId)
    .maybeSingle();

  if (readError || !current) {
    return { ok: false, message: "Collaboration not found." };
  }

  const allowed =
    BUSINESS_COLLABORATION_TRANSITIONS[current.status as CollaborationStatus];
  if (!allowed?.includes(nextStatus)) {
    return { ok: false, message: "That status change is not available." };
  }

  if (nextStatus === "approved") {
    const deliverables = parseDeliverables(current.deliverables);
    if (
      deliverables.length > 0 &&
      !deliverables.every((item) => item.status === "approved")
    ) {
      return {
        ok: false,
        message: "Approve every submitted deliverable first.",
      };
    }
  }

  // submitted_at / completed_at are set by the database trigger — clients
  // no longer have column privileges to write workflow timestamps.
  const { data, error } = await supabase
    .from("collaborations")
    .update({ status: nextStatus })
    .eq("id", collaborationId)
    .eq("business_profile_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, message: "Could not update the collaboration status." };
  }

  return { ok: true, data: toCollaborationRow(data as unknown as CollaborationRow) };
}

/** Replace the agreed deliverable list during negotiation. Existing statuses
 *  and asset links are preserved; the creator owns those fields. */
export async function saveBusinessDeliverables(
  userId: string,
  collaborationId: string,
  drafts: BusinessDeliverableDraftValues[],
): Promise<ServiceResult<Deliverable[]>> {
  if (new Set(drafts.map((draft) => draft.id)).size !== drafts.length) {
    return { ok: false, message: "Each deliverable needs a unique id." };
  }

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("collaborations")
    .select("status, deliverables")
    .eq("id", collaborationId)
    .eq("business_profile_id", userId)
    .maybeSingle();

  if (readError || !current) {
    return { ok: false, message: "Collaboration not found." };
  }
  if (
    current.status !== "negotiating" &&
    current.status !== "agreement_pending"
  ) {
    return {
      ok: false,
      message: "Deliverables can only be edited while negotiating.",
    };
  }

  const existing = new Map(
    parseDeliverables(current.deliverables).map((item) => [item.id, item]),
  );
  const deliverables: Deliverable[] = drafts.map((draft) => {
    const previous = existing.get(draft.id);
    return {
      id: draft.id,
      title: draft.title,
      due_date: draft.due_date,
      status: previous?.status ?? "pending",
      asset_url: previous?.asset_url ?? null,
    };
  });

  const { error: updateError } = await supabase
    .from("collaborations")
    .update({ deliverables: deliverables as unknown as Json })
    .eq("id", collaborationId)
    .eq("business_profile_id", userId);

  if (updateError) {
    return { ok: false, message: "Could not save the deliverables." };
  }
  return { ok: true, data: deliverables };
}

/** Approve one submitted deliverable during business review. */
export async function approveBusinessDeliverable(
  userId: string,
  collaborationId: string,
  deliverableId: string,
): Promise<ServiceResult<Deliverable[]>> {
  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("collaborations")
    .select("status, deliverables")
    .eq("id", collaborationId)
    .eq("business_profile_id", userId)
    .maybeSingle();

  if (readError || !current) {
    return { ok: false, message: "Collaboration not found." };
  }
  if (!["submitted", "revision_requested"].includes(current.status)) {
    return { ok: false, message: "This work is not awaiting review." };
  }

  const deliverables = parseDeliverables(current.deliverables);
  const index = deliverables.findIndex((item) => item.id === deliverableId);
  if (index === -1) {
    return { ok: false, message: "Deliverable not found." };
  }
  if (deliverables[index].status !== "submitted") {
    return { ok: false, message: "Only submitted deliverables can be approved." };
  }

  deliverables[index] = { ...deliverables[index], status: "approved" };
  const { error: updateError } = await supabase
    .from("collaborations")
    .update({ deliverables: deliverables as unknown as Json })
    .eq("id", collaborationId)
    .eq("business_profile_id", userId);

  if (updateError) {
    return { ok: false, message: "Could not approve the deliverable." };
  }
  return { ok: true, data: deliverables };
}

/** Strip the join columns after an update before returning the collaboration. */
function toCollaborationRow(row: CollaborationRow): Collaboration {
  const { campaigns: _campaigns, ...collaboration } = row;
  void _campaigns;
  return {
    ...collaboration,
    deliverables: parseDeliverables(row.deliverables),
  };
}
