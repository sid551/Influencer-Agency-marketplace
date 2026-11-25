import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ServiceResult } from "./profile.service";
import type {
  SocialAccount,
  Verification,
  VerificationType,
  VerificationWithSocial,
} from "@/types/creator.types";
import {
  VERIFICATION_EVIDENCE_MAX_BYTES,
  VERIFICATION_EVIDENCE_TYPES,
} from "@/lib/validations/verification";

/** Evidence lives at `<userId>/<uuid>.(png|jpg|pdf)` in a private bucket.
 *  Callers must never be able to point a claim at another folder. */
function isOwnEvidencePath(userId: string, path: string | null): boolean {
  if (path === null) return true;
  const prefix = `${userId}/`;
  if (!path.startsWith(prefix)) return false;
  return /^[0-9a-f-]{36}\.(png|jpg|pdf)$/.test(path.slice(prefix.length));
}

interface VerificationRow extends Verification {
  social_accounts:
    | { id: string; platform: string; username: string }
    | { id: string; platform: string; username: string }[]
    | null;
}

/** The caller's claims, newest first. RLS keeps them private. */
export async function listMyVerifications(
  userId: string,
): Promise<VerificationWithSocial[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("verifications")
    .select("*, social_accounts ( id, platform, username )")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as unknown as VerificationRow[]).map((row) => {
    const related = row.social_accounts;
    return {
      ...row,
      social_account: Array.isArray(related) ? (related[0] ?? null) : related,
    };
  });
}

/** Instagram/YouTube accounts the caller can claim ownership of. */
export async function listVerifiableSocialAccounts(
  userId: string,
): Promise<SocialAccount[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_accounts")
    .select("*")
    .eq("profile_id", userId)
    .in("platform", ["instagram", "youtube"])
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as SocialAccount[];
}

/** Upload private evidence to the caller's own folder in the
 *  `verification-docs` bucket. Returns the stored object path. */
export async function uploadVerificationEvidence(
  userId: string,
  file: File,
): Promise<ServiceResult<string>> {
  if (file.size === 0) {
    return { ok: false, message: "That file is empty." };
  }
  if (file.size > VERIFICATION_EVIDENCE_MAX_BYTES) {
    return { ok: false, message: "Evidence files must be 10 MB or smaller." };
  }
  if (
    !VERIFICATION_EVIDENCE_TYPES.includes(
      file.type as (typeof VERIFICATION_EVIDENCE_TYPES)[number],
    )
  ) {
    return { ok: false, message: "Use a PNG, JPEG or PDF file." };
  }

  const extension =
    file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;

  const supabase = await createClient();
  const { error } = await supabase.storage
    .from("verification-docs")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) return { ok: false, message: "Could not upload your evidence file." };
  return { ok: true, data: path };
}

/** Best-effort cleanup of an evidence object inside the caller's folder. */
export async function removeVerificationEvidence(
  userId: string,
  path: string,
): Promise<void> {
  if (!isOwnEvidencePath(userId, path)) return;

  try {
    const supabase = await createClient();
    await supabase.storage.from("verification-docs").remove([path]);
  } catch {
    // Storage cleanup is optional; the caller already has the claim result.
  }
}

export interface RequestVerificationInput {
  type: VerificationType;
  socialAccountId: string | null;
  evidencePath: string | null;
}

/**
 * Open a verification claim. Only status 'pending' is allowed by RLS;
 * method, reviewer and review notes are never supplied by the creator.
 * Social accounts are checked for ownership before being attached.
 */
export async function requestVerification(
  userId: string,
  input: RequestVerificationInput,
): Promise<ServiceResult<Verification>> {
  if (!isOwnEvidencePath(userId, input.evidencePath)) {
    return { ok: false, message: "Invalid evidence path." };
  }

  const supabase = await createClient();

  if (input.socialAccountId) {
    const { data: owned } = await supabase
      .from("social_accounts")
      .select("id")
      .eq("id", input.socialAccountId)
      .eq("profile_id", userId)
      .maybeSingle();

    if (!owned) {
      return { ok: false, message: "Choose one of your own social accounts." };
    }
  }

  const { data, error } = await supabase
    .from("verifications")
    .insert({
      profile_id: userId,
      type: input.type,
      status: "pending",
      social_account_id: input.socialAccountId,
      evidence_path: input.evidencePath,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        message: "You already have an open request for this verification.",
      };
    }
    return { ok: false, message: "Could not submit your request. Please try again." };
  }
  if (!data) return { ok: false, message: "Could not submit your request." };

  return { ok: true, data: data as Verification };
}

/** Cancel an open claim and delete any evidence the caller uploaded. */
export async function cancelVerification(
  userId: string,
  verificationId: string,
): Promise<ServiceResult<null>> {
  const supabase = await createClient();
  const { data: claim } = await supabase
    .from("verifications")
    .select("status, evidence_path")
    .eq("id", verificationId)
    .eq("profile_id", userId)
    .maybeSingle();

  if (!claim) return { ok: false, message: "That request was not found." };
  if (!["pending", "expired"].includes(claim.status)) {
    return { ok: false, message: "Only pending requests can be cancelled." };
  }

  const { error } = await supabase
    .from("verifications")
    .delete()
    .eq("id", verificationId)
    .eq("profile_id", userId);

  if (error) return { ok: false, message: "Could not cancel that request." };

  if (claim.evidence_path) {
    await removeVerificationEvidence(userId, claim.evidence_path);
  }
  return { ok: true, data: null };
}
