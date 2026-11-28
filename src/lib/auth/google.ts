import * as z from "zod";

import { sanitizeNextPath } from "@/lib/validations/auth";

/**
 * Short-lived state carried through the Google OAuth redirect. It is set by
 * the server action that starts sign-in and read by /auth/confirm after
 * Supabase returns. Nothing here grants privileges by itself: the role is
 * only applied by a SECURITY DEFINER RPC for profiles created during the
 * same sign-in attempt.
 */
export const GOOGLE_AUTH_COOKIE = "cm_google_auth_intent";
export const GOOGLE_INTENT_MAX_AGE_SECONDS = 10 * 60;

export const googleRoleSchema = z.enum(["creator", "business"]);
export type GoogleRole = z.output<typeof googleRoleSchema>;

export interface GoogleAuthIntent {
  role: GoogleRole;
  next: string | null;
  issuedAt: number;
}

const intentSchema = z.object({
  role: googleRoleSchema,
  next: z.string().nullable(),
  issuedAt: z.number().int().positive(),
});

export function encodeGoogleAuthIntent(intent: GoogleAuthIntent): string {
  return JSON.stringify({
    role: intent.role,
    next: sanitizeNextPath(intent.next),
    issuedAt: intent.issuedAt,
  });
}

/** Rejects stale, malformed or open-redirect intents. */
export function parseGoogleAuthIntent(
  raw: string | undefined,
  now = Date.now(),
): GoogleAuthIntent | null {
  if (!raw) return null;

  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return null;
  }

  const parsed = intentSchema.safeParse(decoded);
  if (!parsed.success) return null;

  const { role, issuedAt } = parsed.data;
  const maxAgeMs = GOOGLE_INTENT_MAX_AGE_SECONDS * 1000;
  if (issuedAt > now + 60_000 || now - issuedAt > maxAgeMs) return null;

  return {
    role,
    next: sanitizeNextPath(parsed.data.next),
    issuedAt,
  };
}

/** Cookie is httpOnly and only sent to this app's auth callback. */
export function googleAuthCookieOptions(siteUrl: string) {
  let secure = false;
  try {
    secure = new URL(siteUrl).protocol === "https:";
  } catch {
    // Invalid configured site URL: keep the local cookie usable.
  }

  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: GOOGLE_INTENT_MAX_AGE_SECONDS,
  };
}
