import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/creator.types";

/** Result type shared by all service mutations. */
export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

/** Columns a user may update (mirrors the column-level UPDATE grant). */
export type ProfilePatch = Partial<
  Pick<
    Profile,
    "full_name" | "username" | "avatar_url" | "city" | "state" | "phone"
  >
>;

/** The caller's own profile row, or null (RLS scopes the read). */
export async function getOwnProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) return null;
  return (data as Profile | null) ?? null;
}

/**
 * Update the caller's own profile. Only granted columns are accepted
 * (role/email/verification fields are rejected by Postgres anyway).
 */
export async function updateOwnProfile(
  userId: string,
  patch: ProfilePatch,
): Promise<ServiceResult<Profile>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "That username is already taken." };
    }
    if (error.code === "42501") {
      return {
        ok: false,
        message: "You don't have permission to make this change.",
      };
    }
    return { ok: false, message: "Could not save your changes. Please try again." };
  }

  if (!data) {
    return { ok: false, message: "Your profile could not be found." };
  }
  return { ok: true, data: data as Profile };
}
