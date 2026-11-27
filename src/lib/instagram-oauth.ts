import { z } from "zod";

import { sanitizeNextPath } from "@/lib/validations/auth";

/**
 * Shared, browser-safe helpers for Instagram Business Login.
 *
 * This file deliberately contains no secrets and no `server-only` import so
 * the URL/state/error helpers can be unit-tested. All token exchange and
 * database work lives in `src/services/instagram-oauth.service.ts`.
 *
 * Hypee-style onboarding uses Instagram Login (`www.instagram.com/oauth/
 * authorize`) with `instagram_business_*` scopes. Meta recommends Unified
 * Login for brand-new apps; see docs/instagram-connection.md if you switch.
 */

export const INSTAGRAM_AUTHORIZE_URL =
  "https://www.instagram.com/oauth/authorize";
export const INSTAGRAM_TOKEN_URL =
  "https://api.instagram.com/oauth/access_token";
export const INSTAGRAM_GRAPH_URL = "https://graph.instagram.com";

export const INSTAGRAM_STATE_COOKIE = "ig_oauth_state";
export const INSTAGRAM_STATE_MAX_AGE_SECONDS = 10 * 60;

/** Smallest useful scope set: identity + follower counts for media kits. */
export const DEFAULT_INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_insights",
] as const;

export const INSTAGRAM_ERROR_MESSAGES: Record<string, string> = {
  missing_config:
    "Instagram connecting isn't configured yet. Ask the site admin to add the Meta app credentials.",
  invalid_state:
    "That Instagram request expired or was invalid. Please try again.",
  access_denied:
    "You cancelled Instagram connecting. You can try again any time.",
  token_exchange_failed:
    "Instagram didn't return a valid access token. Please try again.",
  profile_fetch_failed:
    "We couldn't read your Instagram profile. Please try again.",
  not_professional:
    "Instagram connecting needs a Business or Creator account.",
  save_failed:
    "We couldn't save your Instagram connection. Please try again.",
};

export interface InstagramConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface InstagramProfile {
  id: string;
  username: string;
  accountType?: string;
  followersCount?: number;
}

export interface InstagramState {
  state: string;
  returnTo: string;
  createdAt: number;
}

export interface InstagramNotice {
  status: "connected" | null;
  error: string | null;
}

type Env = Record<string, string | undefined>;
type SearchParams = Record<string, string | string[] | undefined>;

/** Accept only HTTP/HTTPS origins, with no trailing slash. */
export function getAppOrigin(env: Env, fallback: string): string {
  const raw = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return fallback.replace(/\/$/, "");
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return fallback.replace(/\/$/, "");
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return fallback.replace(/\/$/, "");
  }
}

/** Env override is split on commas/spaces and filtered to Meta scope names. */
export function parseInstagramScopes(value: string | undefined): string[] {
  if (!value?.trim()) return [...DEFAULT_INSTAGRAM_SCOPES];
  const scopes = value
    .split(/[\s,]+/)
    .filter((scope) => /^[a-z][a-z0-9_]*$/.test(scope));
  return scopes.length > 0 ? [...new Set(scopes)] : [...DEFAULT_INSTAGRAM_SCOPES];
}

export function isInstagramConfigured(env: Env): boolean {
  return Boolean(env.INSTAGRAM_APP_ID?.trim() && env.INSTAGRAM_APP_SECRET?.trim());
}

/** Returns null when the Meta app credentials have not been configured. */
export function getInstagramConfig(env: Env, origin: string): InstagramConfig | null {
  const appId = env.INSTAGRAM_APP_ID?.trim();
  const appSecret = env.INSTAGRAM_APP_SECRET?.trim();
  if (!appId || !appSecret) return null;

  return {
    appId,
    appSecret,
    redirectUri: `${origin.replace(/\/$/, "")}/api/auth/instagram/callback`,
    scopes: parseInstagramScopes(env.INSTAGRAM_SCOPES),
  };
}

export function buildInstagramAuthorizationUrl(
  config: InstagramConfig,
  state: string,
): string {
  const url = new URL(INSTAGRAM_AUTHORIZE_URL);
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scopes.join(","));
  url.searchParams.set("state", state);
  return url.toString();
}

const stateSchema = z.object({
  state: z.string().min(16),
  returnTo: z.string().refine((value) => sanitizeNextPath(value) !== null),
  createdAt: z.number().int().positive(),
});

/** Parse and expire the HttpOnly OAuth state cookie. */
export function parseInstagramState(
  value: string | undefined,
  now: number = Date.now(),
): InstagramState | null {
  if (!value) return null;
  try {
    const parsed = stateSchema.safeParse(JSON.parse(value));
    if (!parsed.success) return null;
    const age = now - parsed.data.createdAt;
    if (age < 0 || age > INSTAGRAM_STATE_MAX_AGE_SECONDS * 1000) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

const profileSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1).max(100),
  account_type: z.string().optional(),
  followers_count: z.coerce.number().int().nonnegative().optional(),
});

/** Meta returns `id` today; older responses used `user_id`. Accept both. */
export function parseInstagramProfile(payload: unknown): InstagramProfile | null {
  if (typeof payload !== "object" || payload === null) return null;
  const raw = payload as Record<string, unknown>;
  const parsed = profileSchema.safeParse({
    id: raw.id ?? raw.user_id,
    username: raw.username,
    account_type: raw.account_type,
    followers_count: raw.followers_count,
  });
  if (!parsed.success) return null;

  return {
    id: parsed.data.id,
    username: parsed.data.username,
    accountType: parsed.data.account_type,
    followersCount: parsed.data.followers_count,
  };
}

const shortTokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.coerce.number().int().positive().optional(),
});

const longTokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.coerce.number().int().positive().optional(),
});

export function parseShortLivedToken(
  payload: unknown,
): { token: string; expiresIn?: number } | null {
  const parsed = shortTokenSchema.safeParse(payload);
  return parsed.success
    ? { token: parsed.data.access_token, expiresIn: parsed.data.expires_in }
    : null;
}

export function parseLongLivedToken(
  payload: unknown,
): { token: string; expiresIn?: number } | null {
  const parsed = longTokenSchema.safeParse(payload);
  return parsed.success
    ? { token: parsed.data.access_token, expiresIn: parsed.data.expires_in }
    : null;
}

export function instagramErrorMessage(code: string | undefined): string {
  if (!code) return "Something went wrong while connecting Instagram.";
  return (
    INSTAGRAM_ERROR_MESSAGES[code] ??
    "Something went wrong while connecting Instagram. Please try again."
  );
}

function firstValue(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : value ?? null;
}

/** Turn callback query params into a friendly, fixed-set UI notice. */
export function readInstagramNotice(params: SearchParams): InstagramNotice {
  const rawStatus = firstValue(params.instagram);
  const rawError = firstValue(params.instagram_error);
  return {
    status: rawStatus === "connected" ? "connected" : null,
    error: rawError ? instagramErrorMessage(rawError) : null,
  };
}
