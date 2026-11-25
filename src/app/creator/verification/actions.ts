"use server";

import { revalidatePath } from "next/cache";

import { requireCreator } from "@/lib/auth/session";
import { uuidSchema } from "@/lib/validations/ids";
import { verificationRequestSchema } from "@/lib/validations/verification";
import {
  cancelVerification,
  removeVerificationEvidence,
  requestVerification,
  uploadVerificationEvidence,
} from "@/services/verification.service";

export interface VerificationActionState {
  ok: boolean;
  message: string | null;
  fieldErrors: Record<string, string[]>;
}

const EMPTY_STATE: VerificationActionState = {
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

/** Open a manual-review claim. Evidence is uploaded to a private bucket
 *  first and its path is stored on the claim; nothing is auto-verified. */
export async function requestVerificationAction(
  _prev: VerificationActionState,
  formData: FormData,
): Promise<VerificationActionState> {
  const raw = Object.fromEntries(formData.entries());
  const socialAccountId =
    typeof raw.social_account_id === "string" && raw.social_account_id
      ? raw.social_account_id
      : null;

  const parsed = verificationRequestSchema.safeParse({
    type: raw.type,
    social_account_id: socialAccountId,
  });
  if (!parsed.success) {
    return { ...EMPTY_STATE, fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const isOwnershipClaim =
    parsed.data.type === "instagram_ownership" ||
    parsed.data.type === "youtube_ownership";
  if (isOwnershipClaim && !socialAccountId) {
    return {
      ...EMPTY_STATE,
      fieldErrors: { social_account_id: ["Choose one of your social accounts."] },
    };
  }
  if (!isOwnershipClaim && socialAccountId) {
    return {
      ...EMPTY_STATE,
      fieldErrors: {
        social_account_id: ["Only ownership requests need a social account."],
      },
    };
  }

  const fileValue = formData.get("evidence");
  const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
  if (parsed.data.type === "identity" && !file) {
    return {
      ...EMPTY_STATE,
      fieldErrors: { evidence: ["Attach a government ID or similar document."] },
    };
  }

  const { user } = await requireCreator();
  let evidencePath: string | null = null;

  if (file) {
    const uploaded = await uploadVerificationEvidence(user.id, file);
    if (!uploaded.ok) {
      return { ...EMPTY_STATE, fieldErrors: { evidence: [uploaded.message] } };
    }
    evidencePath = uploaded.data;
  }

  const result = await requestVerification(user.id, {
    type: parsed.data.type,
    socialAccountId,
    evidencePath,
  });

  if (!result.ok) {
    if (evidencePath) await removeVerificationEvidence(user.id, evidencePath);
    return { ...EMPTY_STATE, message: result.message };
  }

  revalidatePath("/creator/verification");
  return {
    ...EMPTY_STATE,
    ok: true,
    message: "Request submitted. An admin will review it before anything is verified.",
  };
}

/** Cancel a pending (or expired) claim and remove its evidence. */
export async function cancelVerificationAction(
  _prev: VerificationActionState,
  formData: FormData,
): Promise<VerificationActionState> {
  const id = uuidSchema.safeParse(formData.get("claimId"));
  if (!id.success) {
    return { ...EMPTY_STATE, message: "Invalid request." };
  }

  const { user } = await requireCreator();
  const result = await cancelVerification(user.id, id.data);
  if (!result.ok) return { ...EMPTY_STATE, message: result.message };

  revalidatePath("/creator/verification");
  return { ...EMPTY_STATE, ok: true, message: "Request cancelled." };
}
