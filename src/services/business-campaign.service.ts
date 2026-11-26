import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CampaignValues } from "@/lib/validations/business";
import type { Campaign } from "@/types/campaign.types";
import type { ServiceResult } from "./profile.service";

/** Campaigns owned by the signed-in business, newest first. */
export async function listBusinessCampaigns(
  userId: string,
): Promise<Campaign[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("business_profile_id", userId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data as Campaign[]) ?? [];
}

/** A single owned campaign; RLS and the explicit filter both scope it. */
export async function getBusinessCampaign(
  userId: string,
  campaignId: string,
): Promise<Campaign | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("business_profile_id", userId)
    .maybeSingle();

  if (error) return null;
  return (data as Campaign | null) ?? null;
}

/** Total applications across every campaign owned by the business. */
export async function countBusinessApplications(userId: string): Promise<number> {
  const campaigns = await listBusinessCampaigns(userId);
  if (campaigns.length === 0) return 0;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("campaign_applications")
    .select("id", { count: "exact", head: true })
    .in(
      "campaign_id",
      campaigns.map((campaign) => campaign.id),
    );

  if (error) return 0;
  return count ?? 0;
}

/** Insert a draft or published campaign for the signed-in business. */
export async function createBusinessCampaign(
  userId: string,
  values: CampaignValues,
): Promise<ServiceResult<Campaign>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      business_profile_id: userId,
      title: values.title,
      description: values.description,
      category: values.category,
      platforms: values.platforms,
      collaboration_type: values.collaboration_type,
      budget_min: values.budget_min,
      budget_max: values.budget_max,
      currency: values.currency,
      deliverables: values.deliverables,
      application_deadline: values.application_deadline,
      location: values.location,
      status: values.status,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "42501") {
      return {
        ok: false,
        message: "You don't have permission to create campaigns for this profile.",
      };
    }
    return { ok: false, message: "Could not create the campaign." };
  }
  return { ok: true, data: data as Campaign };
}

/** Update whitelisted columns on an owned campaign. */
export async function updateBusinessCampaign(
  userId: string,
  campaignId: string,
  values: CampaignValues,
): Promise<ServiceResult<Campaign>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .update({
      title: values.title,
      description: values.description,
      category: values.category,
      platforms: values.platforms,
      collaboration_type: values.collaboration_type,
      budget_min: values.budget_min,
      budget_max: values.budget_max,
      currency: values.currency,
      deliverables: values.deliverables,
      application_deadline: values.application_deadline,
      location: values.location,
      status: values.status,
    })
    .eq("id", campaignId)
    .eq("business_profile_id", userId)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "Could not save the campaign." };
  }
  return { ok: true, data: data as Campaign };
}
