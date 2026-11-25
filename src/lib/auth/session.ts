import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getOwnProfile } from "@/services/profile.service";
import type { Profile, ProfileRole } from "@/types/creator.types";

/**
 * Data Access Layer for authentication.
 *
 * Every read goes through these helpers so the "is this user signed
 * in / are they a creator?" checks live in exactly one place. Pages
 * call them inside a <Suspense> boundary (Cache Components rule);
 * Server Actions call them directly — actions must always re-verify
 * the session themselves, never trust render-time gating.
 */

/** Narrow user shape handed around the server — never the raw session. */
export interface AuthUser {
  id: string;
  email: string;
}

export interface CreatorContext {
  user: AuthUser;
  profile: Profile;
}

/**
 * Validate the session cookie against Supabase Auth (network check).
 * Memoized per render pass with React's cache().
 */
export const getUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
});

/** Signed-in user, or redirect to the login page. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** The caller's own profile row (RLS scopes it to the owner). */
export const getProfile = cache(
  async (userId: string): Promise<Profile | null> => getOwnProfile(userId),
);

/**
 * Signed-in creator with their profile, or a redirect:
 *   - no session            → /login
 *   - profile row missing   → /login (account state is broken; re-auth)
 *   - business / admin role → /   (the business side is not built yet)
 */
export async function requireCreator(): Promise<CreatorContext> {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile) redirect("/login");
  if (profile.role !== "creator") redirect("/");
  return { user, profile };
}

/** Landing path for a role after login / signup / password reset. */
export function homePathForRole(role: ProfileRole | null | undefined): string {
  return role === "creator" ? "/creator" : "/";
}
