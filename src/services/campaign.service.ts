import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ServiceResult } from "./profile.service";
import type {
  ApplicationWithCampaign,
  Campaign,
  CampaignApplication,
  CampaignWithBusiness,
} from "@/types/campaign.types";

/**
 * Published or active campaigns, newest first. These are the only
 * statuses visible to creators for discovery.
 */
export async function listDiscoverableCampaigns(): Promise<Campaign[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select(
      `*,
      business_profiles (
        company_name,
        website,
        industry
      )`,
    )
    .in("status", ["published", "active"])
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data as Campaign[]) ?? [];
}

/** A single campaign by ID, joined with its business for display. */
export async function getCampaignById(
  campaignId: string,
): Promise<CampaignWithBusiness | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select(
      `*,
      business_profiles (
        company_name,
        website,
        industry
      )`,
    )
    .eq("id", campaignId)
    .maybeSingle();

  if (error || !data) return null;

  const campaign = data as Campaign;
  return {
    ...campaign,
    business: data.business_profiles
      ? {
          company_name: data.business_profiles.company_name,
          website: data.business_profiles.website ?? null,
          industry: data.business_profiles.industry ?? null,
        }
      : null,
  };
}

/** The signed-in creator's own applications, newest first. */
export async function listOwnApplications(
  userId: string,
): Promise<ApplicationWithCampaign[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_applications")
    .select(
      `*,
      campaigns (
        id,
        title,
        category,
        platforms,
        status,
        application_deadline
      )`,
    )
    .eq("creator_profile_id", userId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data as ApplicationWithCampaign[]) ?? [];
}

/** Whether the signed-in creator has already applied to a campaign. */
export async function hasAppliedToCampaign(
  userId: string,
  campaignId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_applications")
    .select("id")
    .eq("creator_profile_id", userId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

/** Insert a campaign application (RLS enforces ownership and eligibility). */
export async function createApplication(input: {
  campaignId: string;
  creatorProfileId: string;
  proposal: string;
  whySuitable: string | null;
  expectedPrice: number;
  currency: string;
}): Promise<ServiceResult<CampaignApplication>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_applications")
    .insert({
      campaign_id: input.campaignId,
      creator_profile_id: input.creatorProfileId,
      proposal: input.proposal,
      why_suitable: input.whySuitable,
      expected_price: input.expectedPrice,
      currency: input.currency,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "You have already applied to this campaign." };
    }
    if (error.code === "42501") {
      return {
        ok: false,
        message: "You don't have permission to apply to this campaign.",
      };
    }
    return { ok: false, message: "Could not submit your application." };
  }

  return { ok: true, data: data as CampaignApplication };
}
