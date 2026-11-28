"use server";

import { redirect } from "next/navigation";

import { requireCreator } from "@/lib/auth/session";
import { setOwnCreatorNiches } from "@/services/creator-niche.service";
import {
  updateOwnCreatorProfile,
  getOwnCreatorProfile,
  type CreatorProfilePatch,
} from "@/services/creator-profile.service";
import {
  updateOwnProfile,
  type ProfilePatch,
} from "@/services/profile.service";
import {
  addOwnSocialAccount,
  removeOwnSocialAccount,
} from "@/services/social-account.service";
import {
  getStepSchema,
  socialAccountSchema,
  TOTAL_ONBOARDING_STEPS,
} from "@/lib/validations/onboarding";
import type { OnboardingValues } from "@/lib/validations/onboarding";
import type { SocialAccount } from "@/types/creator.types";
import type * as z from "zod";

/**
 * Onboarding Server Actions. Every action re-verifies the session,
 * re-validates the payload with the step's Zod schema, and writes
 * through the services (RLS + column-level grants apply).
 */

export interface OnboardingActionState {
  ok: boolean;
  message: string | null;
  fieldErrors: Record<string, string[]>;
  /** Newly created social account (addSocialAccount only). */
  account?: SocialAccount;
}

const EMPTY_STATE: OnboardingActionState = {
  ok: false,
  message: null,
  fieldErrors: {},
};

function fieldErrorsOf(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/**
 * Persist one wizard step, then advance `onboarding_step` (never
 * backwards, so revisiting an earlier step doesn't lose progress).
 */
export async function saveOnboardingStep(input: {
  step: number;
  values: OnboardingValues;
}): Promise<OnboardingActionState> {
  const { step, values } = input;
  const schema = getStepSchema(step);
  if (!schema || step >= 12) {
    return { ...EMPTY_STATE, message: "That step does not exist." };
  }

  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return { ...EMPTY_STATE, fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const { user } = await requireCreator();
  const creatorProfile = await getOwnCreatorProfile(user.id);
  const nextStep = Math.max(creatorProfile?.onboarding_step ?? 0, step);

  async function advance(): Promise<OnboardingActionState | null> {
    if (nextStep <= (creatorProfile?.onboarding_step ?? 0)) return null;
    const result = await updateOwnCreatorProfile(user.id, {
      onboarding_step: nextStep,
    });
    return result.ok ? null : { ...EMPTY_STATE, message: result.message };
  }

  // --- Fields owned by public.profiles (steps 1–4, 11) ---
  if ([1, 2, 3, 4, 11].includes(step)) {
    // Keys must be DB column names (snake_case), not form field names.
    const patch: ProfilePatch =
      step === 1
        ? { full_name: values.fullName.trim() }
        : step === 2
          ? { username: values.username }
          : step === 3
            ? { avatar_url: values.avatarUrl === "" ? null : values.avatarUrl }
            : step === 4
              ? { city: values.city.trim(), state: values.state.trim() }
              : { phone: values.phone === "" ? null : values.phone.trim() };

    const saved = await updateOwnProfile(user.id, patch);
    if (!saved.ok) {
      return { ...EMPTY_STATE, message: saved.message };
    }

    const failure = await advance();
    if (failure) return failure;
    return { ...EMPTY_STATE, ok: true };
  }

  // --- Steps 9/10 and creator-owned fields need the row to exist ---
  if (!creatorProfile) {
    return {
      ...EMPTY_STATE,
      message: "Your creator profile could not be found. Log out and back in.",
    };
  }

  // Step 9: social accounts are persisted through addSocialAccount /
  // removeSocialAccount — here we only mark the step complete.
  if (step === 9) {
    const failure = await advance();
    if (failure) return failure;
    return { ...EMPTY_STATE, ok: true };
  }

  // Step 6 writes relational niche rows (plus the legacy display column).
  if (step === 6) {
    const savedNiches = await setOwnCreatorNiches(user.id, {
      primary: values.primaryNiche,
      niches: values.niches,
    });
    if (!savedNiches.ok) {
      return { ...EMPTY_STATE, message: savedNiches.message };
    }
    const failure = await advance();
    if (failure) return failure;
    return { ...EMPTY_STATE, ok: true };
  }

  // --- Fields owned by public.creator_profiles (steps 5, 7, 8, 10) ---
  const creatorPatch: CreatorProfilePatch | null =
    step === 5
      ? { bio: values.bio.trim(), onboarding_step: nextStep }
      : step === 7
          ? { languages: [...values.languages], onboarding_step: nextStep }
          : step === 8
            ? { content_types: [...values.contentTypes], onboarding_step: nextStep }
            : step === 10
              ? {
                  collaboration_preferences: [
                    ...values.collaborationPreferences,
                  ],
                  onboarding_step: nextStep,
                }
              : null;

  if (!creatorPatch) {
    return { ...EMPTY_STATE, message: "That step does not exist." };
  }

  const saved = await updateOwnCreatorProfile(user.id, creatorPatch);
  if (!saved.ok) {
    return { ...EMPTY_STATE, message: saved.message };
  }
  return { ...EMPTY_STATE, ok: true };
}

/**
 * Final step: verify everything required is on file, then mark the
 * onboarding complete. The dashboard is unlocked by this flag.
 */
export async function completeOnboarding(): Promise<OnboardingActionState> {
  const { user, profile } = await requireCreator();
  const creatorProfile = await getOwnCreatorProfile(user.id);

  if (!creatorProfile) {
    return {
      ...EMPTY_STATE,
      message: "Your creator profile could not be found. Log out and back in.",
    };
  }

  const missing: string[] = [];
  if (!profile.full_name) missing.push("full name");
  if (!profile.username) missing.push("username");
  if (!profile.city || !profile.state) missing.push("location");
  if (!creatorProfile.bio) missing.push("bio");
  if (creatorProfile.niches.length === 0) missing.push("niches");
  if (creatorProfile.languages.length === 0) missing.push("languages");
  if (creatorProfile.content_types.length === 0) {
    missing.push("content types");
  }
  if (creatorProfile.collaboration_preferences.length === 0) {
    missing.push("collaboration preferences");
  }

  if (missing.length > 0) {
    return {
      ...EMPTY_STATE,
      message: `Still needed: ${missing.join(", ")}. Head back and complete those steps.`,
    };
  }

  const saved = await updateOwnCreatorProfile(user.id, {
    onboarding_step: TOTAL_ONBOARDING_STEPS,
    onboarding_completed: true,
  });
  if (!saved.ok) {
    return { ...EMPTY_STATE, message: saved.message };
  }

  // Creators land on discovery after finishing onboarding.
  redirect("/creator/discover");
}

// ---------------------------------------------------------------
// Social accounts (step 9 — saved through its own actions so the
// list updates immediately without re-submitting the wizard).
// ---------------------------------------------------------------

export async function addSocialAccount(input: {
  platform: string;
  username: string;
}): Promise<OnboardingActionState> {
  const parsed = socialAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { ...EMPTY_STATE, fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const { user } = await requireCreator();
  const result = await addOwnSocialAccount(user.id, {
    platform: parsed.data.platform,
    username: parsed.data.username,
  });

  if (!result.ok) {
    return { ...EMPTY_STATE, message: result.message };
  }
  return { ...EMPTY_STATE, ok: true, account: result.data };
}

export async function removeSocialAccount(input: {
  accountId: string;
}): Promise<OnboardingActionState> {
  if (typeof input.accountId !== "string" || input.accountId.length === 0) {
    return { ...EMPTY_STATE, message: "That account was not found." };
  }

  const { user } = await requireCreator();
  const result = await removeOwnSocialAccount(user.id, input.accountId);

  if (!result.ok) {
    return { ...EMPTY_STATE, message: result.message };
  }
  return { ...EMPTY_STATE, ok: true };
}
