import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { requireCreator } from "@/lib/auth/session";
import {
  buildInstagramAuthorizationUrl,
  getAppOrigin,
  getInstagramConfig,
  INSTAGRAM_STATE_COOKIE,
  INSTAGRAM_STATE_MAX_AGE_SECONDS,
} from "@/lib/instagram-oauth";
import { sanitizeNextPath } from "@/lib/validations/auth";

/**
 * Step 9 "Connect Instagram" entry point. Mirrors Hypee's
 * `/api/auth/instagram`: the browser only ever follows a server-built URL,
 * so the app secret and redirect URI stay server-side.
 */
export async function GET(request: NextRequest) {
  await requireCreator();

  const url = new URL(request.url);
  const origin = getAppOrigin(process.env, url.origin);
  const returnTo =
    sanitizeNextPath(url.searchParams.get("return")) ?? "/creator/onboarding";

  const config = getInstagramConfig(process.env, origin);
  if (!config) {
    return NextResponse.redirect(
      `${origin}${returnTo}?instagram_error=missing_config`,
    );
  }

  const state = randomBytes(32).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(
    INSTAGRAM_STATE_COOKIE,
    JSON.stringify({ state, returnTo, createdAt: Date.now() }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: origin.startsWith("https://"),
      path: "/",
      maxAge: INSTAGRAM_STATE_MAX_AGE_SECONDS,
    },
  );

  return NextResponse.redirect(buildInstagramAuthorizationUrl(config, state));
}
