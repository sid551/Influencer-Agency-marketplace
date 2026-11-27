"use server";

import { requireCreator } from "@/lib/auth/session";
import { disconnectOwnInstagramAccount } from "@/services/instagram-oauth.service";
import {
  addOwnSocialAccount,
  removeOwnSocialAccount,
  listOwnSocialAccounts,
} from "@/services/social-account.service";
import { socialAccountSchema } from "@/lib/validations/onboarding";
import { uuidSchema } from "@/lib/validations/ids";

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

/** Revoke Instagram access: deletes the encrypted token and account row. */
export async function disconnectInstagramAction(): Promise<SocialAccountActionState> {
  const { user } = await requireCreator();
  const result = await disconnectOwnInstagramAccount(user.id);
  return result.ok
    ? { ...EMPTY_STATE, ok: true }
    : { ...EMPTY_STATE, message: result.message };
}

export async function removeSocialAccountAction(
  _prev: SocialAccountActionState,
  formData: FormData,
): Promise<SocialAccountActionState> {
  const accountId = uuidSchema.safeParse(formData.get("accountId"));
  if (!accountId.success) {
    return { ...EMPTY_STATE, message: "Account not found." };
  }

  const { user } = await requireCreator();
  const result = await removeOwnSocialAccount(user.id, accountId.data);

  if (!result.ok) {
    return { ...EMPTY_STATE, message: result.message };
  }

  return { ...EMPTY_STATE, ok: true };
}
