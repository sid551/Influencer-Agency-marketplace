import { NextResponse, type NextRequest } from "next/server";

import { emailOtpTypeSchema, sanitizeNextPath } from "@/lib/validations/auth";
import { homePathForRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRole } from "@/types/creator.types";

/**
 * Email confirmation / password-reset landing route.
 *
 * Supabase Auth redirects here with either:
 *   - ?code=...            (PKCE flow — exchanged for a session), or
 *   - ?token_hash=...&type=... (verifyOtp flow, used by the
 *     "reset password" email template's {{ .SiteURL }} link).
 *
 * After the session is established the user is sent to a sanitized
 * same-origin path, falling back to a role-based landing page.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const rawNext = searchParams.get("next");
  const errorDescription = searchParams.get("error_description");

  const next = sanitizeNextPath(rawNext);
  const otpType = emailOtpTypeSchema.safeParse(type);

  if (errorDescription) {
    const params = new URLSearchParams({ error: errorDescription });
    return NextResponse.redirect(`${origin}/login?${params.toString()}`);
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`,
      );
    }
  } else if (tokenHash) {
    if (!otpType.success) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent("Invalid confirmation link.")}`,
      );
    }
    const { error } = await supabase.auth.verifyOtp({
      type: otpType.data,
      token_hash: tokenHash,
    });
    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`,
      );
    }
  } else {
    // Nothing to confirm — send the user somewhere sensible.
    return NextResponse.redirect(`${origin}/login`);
  }

  // Determine where to land based on the (now confirmed) session.
  const { data } = await supabase.auth.getUser();
  let defaultPath = "/";
  if (data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();
    defaultPath = homePathForRole(profile?.role as ProfileRole | undefined);
  }

  return NextResponse.redirect(`${origin}${next ?? defaultPath}`);
}
