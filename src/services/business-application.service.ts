import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  BUSINESS_APPLICATION_TRANSITIONS,
  type ApplicationStatus,
  type BusinessApplicationDecision,
  type Campaign,
  type CampaignStatus,
} from "@/types/campaign.types";
import type {
  BusinessApplication,
  BusinessCampaignDashboardItem,
  BusinessCreator,
} from "@/types/business.types";
import type { CreatorDirectoryEntry } from "@/types/creator.types";
import type { ServiceResult } from "./profile.service";

const CREATOR_COLUMNS =
  "profile_id, full_name, username, avatar_url, city, state, niches";

type ApplicationRow = Omit<BusinessApplication, "campaign" | "creator"> & {
  campaigns: { id: string; title: string; status: string } | null;
};

type DashboardApplicationRow = Pick<BusinessApplication, "campaign_id">;

/** Public-safe creator summaries for the supplied profile IDs. */
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

  const entries = data as unknown as Pick<
    CreatorDirectoryEntry,
    "profile_id" | "full_name" | "username" | "avatar_url" | "city" | "state" | "niches"
  >[];
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

function toBusinessApplication(
  row: ApplicationRow,
  creators: Map<string, BusinessCreator>,
): BusinessApplication {
  const { campaigns, ...application } = row;
  return {
    ...application,
    status: application.status as ApplicationStatus,
    campaign: campaigns
      ? {
          id: campaigns.id,
          title: campaigns.title,
          status: campaigns.status as CampaignStatus,
        }
      : null,
    creator: creators.get(application.creator_profile_id) ?? null,
  };
}

/** Applications to any campaign owned by the signed-in business. */
export async function listBusinessApplications(
  userId: string,
): Promise<BusinessApplication[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_applications")
    .select(
      `*, campaigns!inner ( id, title, status )`,
    )
    .eq("campaigns.business_profile_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  const rows = data as unknown as ApplicationRow[];
  const creators = await creatorSummaries(
    supabase,
    rows.map((row) => row.creator_profile_id),
  );
  return rows.map((row) => toBusinessApplication(row, creators));
}

/** Applications to one owned campaign, newest first. */
export async function listBusinessCampaignApplications(
  userId: string,
  campaignId: string,
): Promise<BusinessApplication[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_applications")
    .select(`*, campaigns!inner ( id, title, status )`)
    .eq("campaign_id", campaignId)
    .eq("campaigns.business_profile_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  const rows = data as unknown as ApplicationRow[];
  const creators = await creatorSummaries(
    supabase,
    rows.map((row) => row.creator_profile_id),
  );
  return rows.map((row) => toBusinessApplication(row, creators));
}

/** One owned application, with campaign and creator display data. */
export async function getBusinessApplication(
  userId: string,
  applicationId: string,
): Promise<BusinessApplication | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_applications")
    .select(`*, campaigns!inner ( id, title, status )`)
    .eq("id", applicationId)
    .eq("campaigns.business_profile_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as unknown as ApplicationRow;
  const creators = await creatorSummaries(supabase, [row.creator_profile_id]);
  return toBusinessApplication(row, creators);
}

/** Application counts grouped by campaign, scoped to the supplied campaign
 *  list. The dashboard shows counts only — creator names stay on the dedicated
 *  Applications and Messages pages. */
export async function listBusinessCampaignApplicationGroups(
  userId: string,
  campaigns: Campaign[],
): Promise<BusinessCampaignDashboardItem[]> {
  if (campaigns.length === 0) return [];

  const supabase = await createClient();
  const campaignIds = campaigns.map((campaign) => campaign.id);
  const { data, error } = await supabase
    .from("campaign_applications")
    .select("campaign_id")
    .in("campaign_id", campaignIds)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return campaigns.map((campaign) => ({
      campaign,
      applicationCount: 0,
    }));
  }

  const rows = data as DashboardApplicationRow[];
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.campaign_id, (counts.get(row.campaign_id) ?? 0) + 1);
  }

  return campaigns.map((campaign) => ({
    campaign,
    applicationCount: counts.get(campaign.id) ?? 0,
  }));
}

/**
 * Accept, finalize or reject an application. The client-side transition
 * check gives a friendly message; the database trigger and the finalization
 * RPCs are authoritative.
 */
export async function reviewBusinessApplication(
  userId: string,
  applicationId: string,
  decision: BusinessApplicationDecision,
): Promise<ServiceResult<{ id: string; status: ApplicationStatus }>> {
  const application = await getBusinessApplication(userId, applicationId);
  if (!application) {
    return { ok: false, message: "Application not found." };
  }
  if (!BUSINESS_APPLICATION_TRANSITIONS[application.status].includes(decision)) {
    return { ok: false, message: "That status change isn't allowed." };
  }

  const supabase = await createClient();

  // Finalizing and declining an accepted applicant also update the linked
  // collaborations. Those multi-table writes run atomically in the database.
  if (decision === "finalized") {
    const { error } = await supabase.rpc("finalize_campaign_application", {
      p_application_id: applicationId,
    });
    if (error) {
      return {
        ok: false,
        message: error.message || "Could not finalize this application.",
      };
    }
  } else if (decision === "rejected" && application.status === "accepted") {
    const { error } = await supabase.rpc("reject_accepted_application", {
      p_application_id: applicationId,
    });
    if (error) {
      return {
        ok: false,
        message: error.message || "Could not decline this application.",
      };
    }
  } else {
    const { data, error } = await supabase
      .from("campaign_applications")
      .update({ status: decision })
      .eq("id", applicationId)
      .select("id, status")
      .maybeSingle();

    if (error || !data) {
      return { ok: false, message: "Could not update this application." };
    }
  }

  return {
    ok: true,
    data: { id: applicationId, status: decision },
  };
}

/**
 * Select a creator at the rate they quoted in their application.
 * Other applicants stay available for the same campaign.
 */
export async function selectBusinessApplicationBid(
  userId: string,
  applicationId: string,
): Promise<ServiceResult<{ id: string; status: ApplicationStatus }>> {
  const application = await getBusinessApplication(userId, applicationId);
  if (!application) {
    return { ok: false, message: "Application not found." };
  }
  if (application.status !== "pending" && application.status !== "accepted") {
    return { ok: false, message: "This creator can no longer be selected." };
  }
  if (
    application.campaign?.status === "completed" ||
    application.campaign?.status === "closed"
  ) {
    return { ok: false, message: "Reopen the campaign before selecting creators." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("finalize_campaign_application", {
    p_application_id: applicationId,
  });
  if (error) {
    return {
      ok: false,
      message: error.message || "Could not select this creator.",
    };
  }

  return { ok: true, data: { id: applicationId, status: "finalized" } };
}
