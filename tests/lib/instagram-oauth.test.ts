import { describe, expect, it } from "vitest";

import {
  buildInstagramAuthorizationUrl,
  DEFAULT_INSTAGRAM_SCOPES,
  getAppOrigin,
  getInstagramConfig,
  instagramErrorMessage,
  parseInstagramProfile,
  parseInstagramScopes,
  parseInstagramState,
  parseLongLivedToken,
  parseShortLivedToken,
  readInstagramNotice,
} from "@/lib/instagram-oauth";
import {
  decryptToken,
  encryptToken,
  getTokenEncryptionKey,
} from "@/lib/instagram-token";

const KEY = Buffer.from("a".repeat(32)).toString("base64");

describe("Instagram OAuth helpers", () => {
  it("builds the Business Login URL with server-side secrets kept out of it", () => {
    const config = getInstagramConfig(
      {
        INSTAGRAM_APP_ID: "app-123",
        INSTAGRAM_APP_SECRET: "super-secret",
      },
      "https://example.com",
    );
    expect(config).not.toBeNull();

    const url = new URL(buildInstagramAuthorizationUrl(config!, "state-123"));
    expect(url.origin + url.pathname).toBe(
      "https://www.instagram.com/oauth/authorize",
    );
    expect(url.searchParams.get("client_id")).toBe("app-123");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://example.com/api/auth/instagram/callback",
    );
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe(DEFAULT_INSTAGRAM_SCOPES.join(","));
    expect(url.searchParams.get("state")).toBe("state-123");
    expect(url.search).not.toContain("super-secret");
  });

  it("returns no config until both Meta credentials exist", () => {
    expect(getInstagramConfig({}, "https://example.com")).toBeNull();
    expect(
      getInstagramConfig({ INSTAGRAM_APP_ID: "id" }, "https://example.com"),
    ).toBeNull();
  });

  it("sanitizes the app origin and filters requested scopes", () => {
    expect(getAppOrigin({ NEXT_PUBLIC_SITE_URL: "https://x.com/" }, "http://localhost")).toBe(
      "https://x.com",
    );
    expect(getAppOrigin({ NEXT_PUBLIC_SITE_URL: "javascript:alert(1)" }, "http://localhost")).toBe(
      "http://localhost",
    );
    expect(
      parseInstagramScopes(
        "instagram_business_basic, BAD-SCOPE!,instagram_business_basic",
      ),
    ).toEqual(["instagram_business_basic"]);
    expect(parseInstagramScopes(undefined)).toEqual([...DEFAULT_INSTAGRAM_SCOPES]);
  });

  it("expires state cookies and rejects off-site return paths", () => {
    const cookie = JSON.stringify({
      state: "abcdefghijklmnopqrstuvwxyz",
      returnTo: "/creator/onboarding",
      createdAt: 1000,
    });
    expect(parseInstagramState(cookie, 1000 + 60_000)).toMatchObject({
      state: "abcdefghijklmnopqrstuvwxyz",
      returnTo: "/creator/onboarding",
    });
    expect(parseInstagramState(cookie, 1000 + 11 * 60_000)).toBeNull();
    expect(parseInstagramState("not-json")).toBeNull();
    expect(
      parseInstagramState(
        JSON.stringify({
          state: "abcdefghijklmnopqrstuvwxyz",
          returnTo: "//evil.example",
          createdAt: 1000,
        }),
        1000,
      ),
    ).toBeNull();
  });

  it("reads profiles from both current and legacy Instagram ids", () => {
    expect(
      parseInstagramProfile({
        id: "1789",
        username: "creator.handle",
        account_type: "CREATOR",
        followers_count: "12000",
      }),
    ).toEqual({
      id: "1789",
      username: "creator.handle",
      accountType: "CREATOR",
      followersCount: 12000,
    });
    expect(
      parseInstagramProfile({ user_id: "42", username: "legacy" }),
    ).toMatchObject({ id: "42", username: "legacy" });
    expect(parseInstagramProfile({ id: "1" })).toBeNull();
  });

  it("validates token responses", () => {
    expect(parseShortLivedToken({ access_token: "short" })).toEqual({
      token: "short",
      expiresIn: undefined,
    });
    expect(parseLongLivedToken({ access_token: "long", expires_in: "5184000" })).toEqual({
      token: "long",
      expiresIn: 5184000,
    });
    expect(parseLongLivedToken({ error: "bad" })).toBeNull();
  });

  it("turns callback flags into fixed, friendly notices", () => {
    expect(readInstagramNotice({ instagram: "connected" })).toEqual({
      status: "connected",
      error: null,
    });
    expect(readInstagramNotice({ instagram_error: "access_denied" })).toEqual({
      status: null,
      error: instagramErrorMessage("access_denied"),
    });
    expect(readInstagramNotice({ instagram: "anything" })).toEqual({
      status: null,
      error: null,
    });
  });
});

describe("Instagram token encryption", () => {
  it("round-trips a token and detects tampering", () => {
    const key = getTokenEncryptionKey({ INSTAGRAM_TOKEN_ENCRYPTION_KEY: KEY });
    expect(key).not.toBeNull();
    const encrypted = encryptToken("ig-token-value", key!);
    expect(encrypted.ciphertext).not.toContain("ig-token-value");
    expect(decryptToken(encrypted, key!)).toBe("ig-token-value");

    const tagChars = encrypted.tag.split("");
    tagChars[0] = tagChars[0] === "A" ? "B" : "A";
    expect(() =>
      decryptToken({ ...encrypted, tag: tagChars.join("") }, key!),
    ).toThrow();
  });

  it("requires a 32-byte key", () => {
    expect(getTokenEncryptionKey({})).toBeNull();
    expect(() =>
      getTokenEncryptionKey({
        INSTAGRAM_TOKEN_ENCRYPTION_KEY: Buffer.from("too-short").toString("base64"),
      }),
    ).toThrow(/32-byte/);
  });
});
