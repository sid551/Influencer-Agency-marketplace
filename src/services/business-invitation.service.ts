import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  BusinessCreator,
  BusinessInvitation,
} from "@/types/business.types";
import type {
  CollaborationRequest,
  CollaborationRequestStatus,
} from "@/types/campaign.types";
import type { CreatorDirectoryEntry } from "@/types/creator.types";
import type { ServiceResult } from "./profile.service";

const CREATOR_COLUMNS =
  "profile_id, full_name, username, avatar_url, city, state, niches";

type InvitationRow = Omit<BusinessInvitation, "campaign" | "creator"> & {
  campaigns: { id: string; title: string } | null;
};

async function creatorSummaries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  creatorIds: string[],
): Promise<Map<string, BusinessCreator>> {
  if (creatorIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("creator_directory")
    .select(CREATOR_COLUMNS)
    .in("profile_id", creatorIds);
  if (error || !data) return new Map();

  const entries = data as unknown as CreatorDirectoryEntry[];
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

/** Public-safe creator directory used when composing an invitation. */
export async function listCreatorsForInvite(): Promise<CreatorDirectoryEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creator_directory")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as unknown as CreatorDirectoryEntry[];
}

/** All invitations sent by the signed-in business, newest first. */
export async function listBusinessInvitations(
  userId: string,
): Promise<BusinessInvitation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collaboration_requests")
    .select(`*, campaigns ( id, title )`)
    .eq("business_profile_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  const rows = data as unknown as InvitationRow[];
  const creators = await creatorSummaries(
    supabase,
    rows.map((row) => row.creator_profile_id),
  );

  return rows.map((row) => {
    const { campaigns, ...invitation } = row;
    return {
      ...invitation,
      status: invitation.status as CollaborationRequestStatus,
      campaign: campaigns,
      creator: creators.get(row.creator_profile_id) ?? null,
    };
  });
}

/** Send a pending invitation. RLS requires the business row to be the caller's. */
export async function createBusinessInvitation(
  userId: string,
  input: {
    creatorProfileId: string;
    campaignId: string | null;
    message: string;
  },
): Promise<ServiceResult<CollaborationRequest>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collaboration_requests")
    .insert({
      creator_profile_id: input.creatorProfileId,
      business_profile_id: userId,
      campaign_id: input.campaignId,
      message: input.message,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        message: "You already invited this creator for this campaign.",
      };
    }
    if (error.code === "42501") {
      return {
        ok: false,
        message: "You don't have permission to send invitations for this profile.",
      };
    }
    return { ok: false, message: "Could not send the invitation." };
  }
  return { ok: true, data: data as CollaborationRequest };
}

/** Cancel a pending invitation (no delete or message edits are permitted). */
export async function cancelBusinessInvitation(
  userId: string,
  requestId: string,
): Promise<ServiceResult<{ id: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collaboration_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId)
    .eq("business_profile_id", userId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      message: "That invitation can no longer be cancelled.",
    };
  }
  return { ok: true, data: { id: data.id } };
}
