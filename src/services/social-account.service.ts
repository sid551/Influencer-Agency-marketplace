import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SocialAccount } from "@/types/creator.types";
import type { ServiceResult } from "./profile.service";

/** The caller's own social accounts, newest first. */
export async function listOwnSocialAccounts(
  userId: string,
): Promise<SocialAccount[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_accounts")
    .select("*")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data as SocialAccount[]) ?? [];
}

/**
 * Link a social account to the caller's profile. Only the owner can
 * insert (RLS), and the row always starts as 'unverified' — the
 * verification columns are never sent from the client.
 */
export async function addOwnSocialAccount(
  userId: string,
  input: { platform: string; username: string },
): Promise<ServiceResult<SocialAccount>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_accounts")
    .insert({
      profile_id: userId,
      platform: input.platform,
      username: input.username,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "You've already added that account." };
    }
    return { ok: false, message: "Could not add that account. Please try again." };
  }

  if (!data) {
    return { ok: false, message: "Could not add that account. Please try again." };
  }
  return { ok: true, data: data as SocialAccount };
}

/** Remove one of the caller's own social accounts. */
export async function removeOwnSocialAccount(
  userId: string,
  accountId: string,
): Promise<ServiceResult<null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_accounts")
    .delete()
    .eq("id", accountId)
    .eq("profile_id", userId)
    .select("id");

  if (error) {
    return { ok: false, message: "Could not remove that account. Please try again." };
  }
  if (!data || data.length === 0) {
    return { ok: false, message: "That account was not found." };
  }
  return { ok: true, data: null };
}
