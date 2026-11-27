import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { requireCreator } from "@/lib/auth/session";
import {
  getAppOrigin,
  getInstagramConfig,
  INSTAGRAM_STATE_COOKIE,
  parseInstagramState,
} from "@/lib/instagram-oauth";
import {
  exchangeInstagramCode,
  fetchInstagramProfile,
  persistInstagramConnection,
} from "@/services/instagram-oauth.service";

/**
 * Instagram Business Login callback. Validates the CSRF state cookie,
 * exchanges the code server-side, verifies the professional account and
 * persists an encrypted token through the privileged RPC. Only fixed error
 * codes are sent back in the URL — never tokens or Meta's error details.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = getAppOrigin(process.env, url.origin);
  const cookieStore = await cookies();
  const stored = parseInstagramState(
    cookieStore.get(INSTAGRAM_STATE_COOKIE)?.value,
  );
  cookieStore.delete(INSTAGRAM_STATE_COOKIE);

  const returnTo = stored?.returnTo ?? "/creator/onboarding";
  const fail = (code: string) =>
    NextResponse.redirect(
      `${origin}${returnTo}?instagram_error=${encodeURIComponent(code)}`,
    );

  if (url.searchParams.get("error")) return fail("access_denied");

  const code = url.searchParams.get("code");
  if (!code || !stored || !stateMatches(stored.state, url.searchParams.get("state"))) {
    return fail("invalid_state");
  }

  const config = getInstagramConfig(process.env, origin);
  if (!config) return fail("missing_config");

  // The session may have expired while the user was at Instagram.
  const { user } = await requireCreator();

  const token = await exchangeInstagramCode(code, config);
  if (!token.ok) return fail(token.message);

  const profile = await fetchInstagramProfile(token.data.accessToken);
  if (!profile.ok) return fail(profile.message);

  const saved = await persistInstagramConnection(user.id, profile.data, token.data);
  if (!saved.ok) return fail(saved.message);

  return NextResponse.redirect(`${origin}${returnTo}?instagram=connected`);
}

function stateMatches(expected: string, actual: string | null): boolean {
  if (!actual) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(actual);
  return left.length === right.length && timingSafeEqual(left, right);
}
