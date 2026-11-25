import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CreatorProfile } from "@/types/creator.types";
import type { ServiceResult } from "./profile.service";

/** Columns a user may update (mirrors the column-level UPDATE grant). */
export type CreatorProfilePatch = Partial<
  Pick<
    CreatorProfile,
    | "bio"
    | "niches"
    | "languages"
    | "content_types"
    | "collaboration_preferences"
    | "onboarding_step"
    | "onboarding_completed"
  >
>;

/** The caller's own creator profile, or null. */
export async function getOwnCreatorProfile(
  userId: string,
): Promise<CreatorProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) return null;
  return (data as CreatorProfile | null) ?? null;
}

/** Update the caller's own creator profile (owner-only via RLS). */
export async function updateOwnCreatorProfile(
  userId: string,
  patch: CreatorProfilePatch,
): Promise<ServiceResult<CreatorProfile>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creator_profiles")
    .update(patch)
    .eq("profile_id", userId)
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") {
      return {
        ok: false,
        message: "You don't have permission to make this change.",
      };
    }
    return { ok: false, message: "Could not save your changes. Please try again." };
  }

  if (!data) {
    return { ok: false, message: "Your creator profile could not be found." };
  }
  return { ok: true, data: data as CreatorProfile };
}
