import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  INSTAGRAM_GRAPH_URL,
  INSTAGRAM_TOKEN_URL,
  parseInstagramProfile,
  parseLongLivedToken,
  parseShortLivedToken,
  type InstagramConfig,
  type InstagramProfile,
} from "@/lib/instagram-oauth";
import { encryptToken, getTokenEncryptionKey } from "@/lib/instagram-token";
import type { ServiceResult } from "./profile.service";

/**
 * Server-only Instagram Business Login service.
 *
 * Failure messages are stable error codes (see INSTAGRAM_ERROR_MESSAGES) so
 * route handlers can turn them into query flags without leaking Meta's raw
 * error text or tokens to the browser.
 */

const SIXTY_DAYS_SECONDS = 60 * 24 * 60 * 60;

export interface InstagramToken {
  accessToken: string;
  expiresAt: Date;
  scopes: string[];
}

function fail(code: string): ServiceResult<never> {
  return { ok: false, message: code };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/** Exchange the one-time code for a short-lived token, then a 60-day token. */
export async function exchangeInstagramCode(
  code: string,
  config: InstagramConfig,
): Promise<ServiceResult<InstagramToken>> {
  const body = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
    code,
  });

  let response: Response;
  try {
    response = await fetch(INSTAGRAM_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
  } catch {
    return fail("token_exchange_failed");
  }
  if (!response.ok) return fail("token_exchange_failed");

  const shortLived = parseShortLivedToken(await readJson(response));
  if (!shortLived) return fail("token_exchange_failed");

  const exchangeUrl = new URL(`${INSTAGRAM_GRAPH_URL}/access_token`);
  exchangeUrl.searchParams.set("grant_type", "ig_exchange_token");
  exchangeUrl.searchParams.set("client_secret", config.appSecret);
  exchangeUrl.searchParams.set("access_token", shortLived.token);

  let longResponse: Response;
  try {
    longResponse = await fetch(exchangeUrl, { cache: "no-store" });
  } catch {
    return fail("token_exchange_failed");
  }
  if (!longResponse.ok) return fail("token_exchange_failed");

  const longLived = parseLongLivedToken(await readJson(longResponse));
  if (!longLived) return fail("token_exchange_failed");

  const lifetime = longLived.expiresIn ?? SIXTY_DAYS_SECONDS;
  return {
    ok: true,
    data: {
      accessToken: longLived.token,
      expiresAt: new Date(Date.now() + lifetime * 1000),
      scopes: config.scopes,
    },
  };
}

/** Read the professional account's public identity and follower count. */
export async function fetchInstagramProfile(
  accessToken: string,
): Promise<ServiceResult<InstagramProfile>> {
  const url = new URL(`${INSTAGRAM_GRAPH_URL}/me`);
  url.searchParams.set(
    "fields",
    "id,username,account_type,followers_count",
  );
  url.searchParams.set("access_token", accessToken);

  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch {
    return fail("profile_fetch_failed");
  }
  if (!response.ok) return fail("profile_fetch_failed");

  const profile = parseInstagramProfile(await readJson(response));
  if (!profile) return fail("profile_fetch_failed");
  if (
    profile.accountType &&
    !["BUSINESS", "CREATOR"].includes(profile.accountType.toUpperCase())
  ) {
    return fail("not_professional");
  }
  return { ok: true, data: profile };
}

/**
 * Persist through a SECURITY DEFINER RPC: owner grants deliberately forbid
 * writing `verification_*` columns, so only the privileged function can mark
 * an Instagram account verified. The token is encrypted before it leaves
 * this process.
 */
export async function persistInstagramConnection(
  userId: string,
  profile: InstagramProfile,
  token: InstagramToken,
): Promise<ServiceResult<string>> {
  const key = getTokenEncryptionKey();
  if (!key) return fail("missing_config");

  const encrypted = encryptToken(token.accessToken, key);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("connect_instagram_account", {
    p_profile_id: userId,
    p_username: profile.username,
    p_platform_user_id: profile.id,
    p_follower_count: profile.followersCount ?? 0,
    p_token_ciphertext: encrypted.ciphertext,
    p_token_iv: encrypted.iv,
    p_token_tag: encrypted.tag,
    p_token_expires_at: token.expiresAt.toISOString(),
    p_scopes: token.scopes,
  });

  if (error) return fail("save_failed");
  return { ok: true, data: String(data) };
}

/** Delete the encrypted token and the verified account it created. */
export async function disconnectOwnInstagramAccount(
  userId: string,
): Promise<ServiceResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("disconnect_instagram_account", {
    p_profile_id: userId,
  });
  if (error) {
    return { ok: false, message: "Could not disconnect Instagram. Please try again." };
  }
  return { ok: true, data: null };
}
