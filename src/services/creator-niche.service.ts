import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Niche } from "@/types/creator.types";
import type { ServiceResult } from "./profile.service";

/** A creator's niche set: exactly one primary, any number of secondaries. */
export interface CreatorNiches {
  primary: Niche | "";
  niches: Niche[];
}

/** Callers validate the slugs against NICHE_OPTIONS before writing. */
export interface CreatorNichePatch {
  primary: string;
  niches: string[];
}

/**
 * Read the caller's relational niche rows. Creators whose profile
 * predates this feature still have `creator_profiles.niches` (primary
 * first, from the backfill), so that column is the fallback.
 */
export async function getOwnCreatorNiches(
  userId: string,
): Promise<CreatorNiches> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creator_niches")
    .select("niche_slug, is_primary")
    .eq("creator_profile_id", userId);

  if (error || !data || data.length === 0) {
    const { data: profile } = await supabase
      .from("creator_profiles")
      .select("niches")
      .eq("profile_id", userId)
      .maybeSingle();
    const legacy = ((profile?.niches as string[] | null) ?? []) as Niche[];
    return { primary: legacy[0] ?? "", niches: legacy };
  }

  const rows = data as Array<{ niche_slug: string; is_primary: boolean }>;
  const primary = (rows.find((row) => row.is_primary)?.niche_slug ??
    rows[0].niche_slug) as Niche;
  // Primary first keeps the legacy display column meaningful.
  return {
    primary,
    niches: [
      primary,
      ...rows.map((r) => r.niche_slug as Niche).filter((slug) => slug !== primary),
    ],
  };
}

/**
 * Replace the caller's niche rows and keep the legacy text[] column in
 * sync for existing profile views. RLS restricts every statement to the
 * owner; the partial unique index guarantees a single primary.
 */
export async function setOwnCreatorNiches(
  userId: string,
  patch: CreatorNichePatch,
): Promise<ServiceResult<null>> {
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("creator_niches")
    .delete()
    .eq("creator_profile_id", userId);

  if (deleteError) {
    return { ok: false, message: "Could not update your niches. Please try again." };
  }

  const rows = patch.niches.map((slug) => ({
    creator_profile_id: userId,
    niche_slug: slug,
    is_primary: slug === patch.primary,
  }));

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from("creator_niches")
      .insert(rows);

    if (insertError) {
      return { ok: false, message: "Could not save your niches. Please try again." };
    }
  }

  const { error: legacyError } = await supabase
    .from("creator_profiles")
    .update({ niches: patch.niches })
    .eq("profile_id", userId);

  if (legacyError) {
    return { ok: false, message: "Could not update your profile. Please try again." };
  }

  return { ok: true, data: null };
}
