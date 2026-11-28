"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  sanitizeNextPath,
} from "@/lib/validations/auth";
import {
  encodeGoogleAuthIntent,
  googleAuthCookieOptions,
  googleRoleSchema,
  GOOGLE_AUTH_COOKIE,
  type GoogleRole,
} from "@/lib/auth/google";
import { homePathForRole } from "@/lib/auth/session";
import { authErrorMessage } from "@/lib/auth-error";
import { createClient } from "@/lib/supabase/server";
import type * as z from "zod";

/**
 * Auth Server Actions. Every action:
 *   1. re-verifies state on the server (never trusts the client),
 *   2. re-validates the payload with Zod,
 *   3. returns a serializable state object for useActionState
 *      (redirect() is the only non-serializable outcome, and it throws).
 */

export interface AuthFormState {
  /** Form-level error (bad credentials, network, etc.). */
  error: string | null;
  /** Per-field messages from Zod. */
  fieldErrors: Record<string, string[]>;
  /** Success banner (e.g. "check your email"). */
  message: string | null;
}

const EMPTY_STATE: AuthFormState = {
  error: null,
  fieldErrors: {},
  message: null,
};

function fieldErrorsFrom(flatten: {
  fieldErrors: Record<string, string[] | undefined>;
}): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(flatten.fieldErrors)) {
    if (value && value.length > 0) out[key] = value;
  }
  return out;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function parseOrState<T extends z.ZodType>(
  schema: T,
  raw: Record<string, unknown>,
): { values: z.output<T>; state: null } | { values: null; state: AuthFormState } {
  const result = schema.safeParse(raw);
  if (result.success) return { values: result.data, state: null };
  return {
    values: null,
    state: {
      ...EMPTY_STATE,
      fieldErrors: fieldErrorsFrom(result.error.flatten()),
    },
  };
}

function formDataRecord(formData: FormData): Record<string, unknown> {
  return Object.fromEntries(formData.entries());
}

// ---------------------------------------------------------------
// Login
// ---------------------------------------------------------------

export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = parseOrState(loginSchema, formDataRecord(formData));
  if (parsed.values === null) return parsed.state;

  const { email, password } = parsed.values;
  const next = sanitizeNextPath(formData.get("next"));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    return { ...EMPTY_STATE, error: authErrorMessage(error.message) };
  }

  // Read the role with the same client — the session was just created
  // in this request, so this avoids depending on cookie propagation.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  redirect(next ?? homePathForRole(profile?.role));
}

// ---------------------------------------------------------------
// Google Sign-In
// ---------------------------------------------------------------

/**
 * Starts Supabase's PKCE Google flow. The selected role and safe return path
 * travel in a short-lived httpOnly cookie because OAuth sign-in cannot carry
 * app metadata. /auth/confirm reads the cookie after the provider callback.
 */
export async function startGoogleSignIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const roleResult = googleRoleSchema.safeParse(formData.get("role"));
  const role: GoogleRole = roleResult.success ? roleResult.data : "creator";
  const next = sanitizeNextPath(formData.get("next"));

  const cookieStore = await cookies();
  cookieStore.set(
    GOOGLE_AUTH_COOKIE,
    encodeGoogleAuthIntent({ role, next, issuedAt: Date.now() }),
    googleAuthCookieOptions(siteUrl()),
  );

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl()}/auth/confirm`,
    },
  });

  if (error) {
    return { ...EMPTY_STATE, error: authErrorMessage(error.message) };
  }
  if (!data.url) {
    return {
      ...EMPTY_STATE,
      error: "Google Sign-In is not configured. Please use email instead.",
    };
  }

  redirect(data.url);
}

// ---------------------------------------------------------------
// Signup
// ---------------------------------------------------------------

export async function signup(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = parseOrState(signupSchema, formDataRecord(formData));
  if (parsed.values === null) return parsed.state;

  const { role, fullName, email, password } = parsed.values;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/confirm`,
      data: { role, full_name: fullName.trim() },
    },
  });

  if (error) {
    return { ...EMPTY_STATE, error: authErrorMessage(error.message) };
  }

  // Auto-confirm enabled (local dev): a session comes back immediately.
  if (data.session) {
    redirect(homePathForRole(role));
  }

  // Otherwise: send the user to the "confirm your email" screen.
  // (Post-login "next" is intentionally not carried over here — the
  // account is not signed in yet.)
  redirect(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
}

// ---------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------

export async function forgotPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = parseOrState(forgotPasswordSchema, formDataRecord(formData));
  if (parsed.values === null) return parsed.state;

  const email = parsed.values.email.trim().toLowerCase();
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/confirm?next=/reset-password`,
  });

  // Always report success so the endpoint can't be used to probe
  // which emails are registered.
  if (error && !error.message.toLowerCase().includes("rate limit")) {
    // Still show the generic message; only surface hard failures.
    if (!error.message.toLowerCase().includes("email")) {
      return { ...EMPTY_STATE, error: authErrorMessage(error.message) };
    }
  }

  return {
    ...EMPTY_STATE,
    message: `If an account exists for ${email}, we've sent a password reset link.`,
  };
}

// ---------------------------------------------------------------
// Reset password (after clicking the email link)
// ---------------------------------------------------------------

export async function resetPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = parseOrState(resetPasswordSchema, formDataRecord(formData));
  if (parsed.values === null) return parsed.state;

  const supabase = await createClient();

  // The confirm route exchanged the email link for a session, so the
  // user is signed in at this point.
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return {
      ...EMPTY_STATE,
      error: "Your reset link has expired. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.values.password,
  });
  if (error) {
    return { ...EMPTY_STATE, error: authErrorMessage(error.message) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  redirect(homePathForRole(profile?.role));
}

// ---------------------------------------------------------------
// Resend confirmation email
// ---------------------------------------------------------------

export async function resendConfirmation(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const rawEmail = formData.get("email");
  const email =
    typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      ...EMPTY_STATE,
      fieldErrors: { email: ["Enter a valid email address."] },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${siteUrl()}/auth/confirm` },
  });

  if (error) {
    return { ...EMPTY_STATE, error: authErrorMessage(error.message) };
  }

  return {
    ...EMPTY_STATE,
    message: `If an account exists for ${email}, we've sent a new confirmation link.`,
  };
}

// ---------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
