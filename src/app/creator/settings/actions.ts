"use server";

import { requireCreator } from "@/lib/auth/session";
import {
  addOwnSocialAccount,
  removeOwnSocialAccount,
  listOwnSocialAccounts,
} from "@/services/social-account.service";
import { socialAccountSchema } from "@/lib/validations/onboarding";

export interface SocialAccountActionState {
  ok: boolean;
  message: string | null;
  fieldErrors: Record<string, string[]>;
  account?: Awaited<ReturnType<typeof listOwnSocialAccounts>>[number];
}

const EMPTY_STATE: SocialAccountActionState = {
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

export async function addSocialAccountAction(
  _prev: SocialAccountActionState,
  formData: FormData,
): Promise<SocialAccountActionState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = socialAccountSchema.safeParse(raw);
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

export async function removeSocialAccountAction(
  _prev: SocialAccountActionState,
  formData: FormData,
): Promise<SocialAccountActionState> {
  const accountId = formData.get("accountId");
  if (typeof accountId !== "string" || accountId.length === 0) {
    return { ...EMPTY_STATE, message: "Account not found." };
  }

  const { user } = await requireCreator();
  const result = await removeOwnSocialAccount(user.id, accountId);

  if (!result.ok) {
    return { ...EMPTY_STATE, message: result.message };
  }

  return { ...EMPTY_STATE, ok: true };
}
