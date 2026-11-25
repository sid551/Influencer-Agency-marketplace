"use server";

import { requireCreator } from "@/lib/auth/session";
import { updateOwnProfile } from "@/services/profile.service";
import {
  profileEditSchema,
} from "@/lib/validations/profile";

export interface ProfileEditActionState {
  ok: boolean;
  message: string | null;
  fieldErrors: Record<string, string[]>;
}

const EMPTY_STATE: ProfileEditActionState = {
  ok: false,
  message: null,
  fieldErrors: {},
};

function fieldErrorsOf(
  error: { issues: Array<{ path: unknown[]; message: string }> },
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues ?? []) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/**
 * Update the signed-in creator's profile. Re-verifies the session and
 * re-validates the payload on the server before writing through the
 * services (RLS + column-level grants apply).
 */
export async function updateProfile(
  _prev: ProfileEditActionState,
  formData: FormData,
): Promise<ProfileEditActionState> {
  const raw = Object.fromEntries(formData.entries());

  const parsed = profileEditSchema.safeParse(raw);
  if (!parsed.success) {
    return { ...EMPTY_STATE, fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const { user } = await requireCreator();

  // --- public.profiles fields ---
  const profilePatch = {
    full_name: parsed.data.fullName.trim(),
    username: parsed.data.username,
    avatar_url: parsed.data.avatarUrl === "" ? null : parsed.data.avatarUrl,
    city: parsed.data.city ?? null,
    state: parsed.data.state ?? null,
    phone: parsed.data.phone === "" ? null : parsed.data.phone,
  };

  const saved = await updateOwnProfile(user.id, profilePatch);
  if (!saved.ok) {
    return { ...EMPTY_STATE, message: saved.message };
  }

  return { ...EMPTY_STATE, ok: true, message: "Profile updated." };
}
