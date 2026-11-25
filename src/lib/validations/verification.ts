import { z } from "zod";

/** Verification types a creator may request. Email/phone/other claims are
 *  managed by the review workflow rather than self-service. */
export const REQUESTABLE_VERIFICATION_TYPES = [
  "identity",
  "instagram_ownership",
  "youtube_ownership",
  "audience_quality",
] as const;

export const verificationRequestSchema = z.object({
  type: z.enum(REQUESTABLE_VERIFICATION_TYPES),
  social_account_id: z.string().uuid().optional().nullable(),
});

export type VerificationRequestValues = z.infer<typeof verificationRequestSchema>;

/** Matches the migration 0004 `verification-docs` bucket configuration. */
export const VERIFICATION_EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;
export const VERIFICATION_EVIDENCE_TYPES = [
  "image/png",
  "image/jpeg",
  "application/pdf",
] as const;
