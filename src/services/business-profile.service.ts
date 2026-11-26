import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { BusinessProfileValues } from "@/lib/validations/business";
import type { BusinessProfile } from "@/types/creator.types";
import type { ServiceResult } from "./profile.service";

/** The caller's own business profile row, or null (RLS scopes the read). */
export async function getOwnBusinessProfile(
  userId: string,
): Promise<BusinessProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) return null;
  return (data as BusinessProfile | null) ?? null;
}

/** Create the business profile after signup (the trigger does not do this). */
export async function createOwnBusinessProfile(
  userId: string,
  values: BusinessProfileValues,
): Promise<ServiceResult<BusinessProfile>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_profiles")
    .insert({
      profile_id: userId,
      company_name: values.company_name,
      website: values.website,
      description: values.description,
      industry: values.industry,
      onboarding_completed: true,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "Your business profile already exists." };
    }
    if (error.code === "42501") {
      return {
        ok: false,
        message: "A business profile can only be created for your own account.",
      };
    }
    return { ok: false, message: "Could not create your business profile." };
  }

  return { ok: true, data: data as BusinessProfile };
}

/** Update only the columns granted to authenticated business owners. */
export async function updateOwnBusinessProfile(
  userId: string,
  values: BusinessProfileValues,
): Promise<ServiceResult<BusinessProfile>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_profiles")
    .update({
      company_name: values.company_name,
      website: values.website,
      description: values.description,
      industry: values.industry,
    })
    .eq("profile_id", userId)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "Could not save your business profile." };
  }
  return { ok: true, data: data as BusinessProfile };
}

/** Mark onboarding complete; never accepted as a client-supplied field. */
export async function completeBusinessOnboarding(
  userId: string,
): Promise<ServiceResult<BusinessProfile>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_profiles")
    .update({ onboarding_completed: true })
    .eq("profile_id", userId)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "Could not complete your setup." };
  }
  return { ok: true, data: data as BusinessProfile };
}
