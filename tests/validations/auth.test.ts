import { describe, expect, it } from "vitest";

import {
  encodeGoogleAuthIntent,
  googleAuthCookieOptions,
  googleRoleSchema,
  parseGoogleAuthIntent,
} from "@/lib/auth/google";
import {
  emailOtpTypeSchema,
  loginSchema,
  resetPasswordSchema,
  sanitizeNextPath,
  signupSchema,
} from "@/lib/validations/auth";

describe("loginSchema", () => {
  it("accepts an email and a non-empty password", () => {
    expect(
      loginSchema.safeParse({ email: "creator@example.com", password: "secret" })
        .success,
    ).toBe(true);
  });

  it("rejects malformed emails and empty passwords", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});

describe("signupSchema", () => {
  const valid = {
    role: "creator",
    fullName: "Mia Creator",
    email: "mia@example.com",
    password: "password123",
  };

  it("accepts creator and business signups", () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
    expect(signupSchema.safeParse({ ...valid, role: "business" }).success).toBe(true);
  });

  it("never accepts a self-assigned admin role", () => {
    expect(signupSchema.safeParse({ ...valid, role: "admin" }).success).toBe(false);
  });

  it("enforces password complexity", () => {
    expect(signupSchema.safeParse({ ...valid, password: "short1" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...valid, password: "lettersOnly" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...valid, password: "12345678" }).success).toBe(false);
  });

  it("enforces full-name bounds", () => {
    expect(signupSchema.safeParse({ ...valid, fullName: "M" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...valid, fullName: "x".repeat(101) }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("requires matching passwords", () => {
    expect(
      resetPasswordSchema.safeParse({ password: "password123", confirmPassword: "password123" })
        .success,
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({ password: "password123", confirmPassword: "different123" })
        .success,
    ).toBe(false);
  });

  it("applies the same complexity rules as signup", () => {
    expect(
      resetPasswordSchema.safeParse({ password: "12345678", confirmPassword: "12345678" }).success,
    ).toBe(false);
  });
});

describe("emailOtpTypeSchema", () => {
  it("accepts only Supabase email OTP types", () => {
    expect(emailOtpTypeSchema.safeParse("recovery").success).toBe(true);
    expect(emailOtpTypeSchema.safeParse("email_change").success).toBe(true);
    expect(emailOtpTypeSchema.safeParse("admin").success).toBe(false);
    expect(emailOtpTypeSchema.safeParse("sms").success).toBe(false);
  });
});

describe("sanitizeNextPath", () => {
  it("keeps ordinary same-origin paths", () => {
    expect(sanitizeNextPath("/creator")).toBe("/creator");
    expect(sanitizeNextPath("/creator?tab=profile#details")).toBe("/creator?tab=profile#details");
  });

  it("blocks protocol-relative, absolute and obfuscated redirects", () => {
    for (const value of [
      "//evil.example",
      "/\\evil.example",
      "https://evil.example",
      "creator",
      "",
      "/creator\nLocation: https://evil.example",
      "/creator path",
    ]) {
      expect(sanitizeNextPath(value)).toBeNull();
    }
  });

  it("rejects non-string values", () => {
    expect(sanitizeNextPath(undefined)).toBeNull();
    expect(sanitizeNextPath(null)).toBeNull();
    expect(sanitizeNextPath(42)).toBeNull();
    expect(sanitizeNextPath(["/creator"])).toBeNull();
  });
});

describe("Google auth intent", () => {
  const now = 1_800_000_000_000;

  it("round-trips a valid role and same-origin return path", () => {
    const raw = encodeGoogleAuthIntent({
      role: "business",
      next: "/business/campaigns?status=live",
      issuedAt: now,
    });
    expect(parseGoogleAuthIntent(raw, now)).toEqual({
      role: "business",
      next: "/business/campaigns?status=live",
      issuedAt: now,
    });
  });

  it("only accepts creator or business roles", () => {
    expect(googleRoleSchema.safeParse("admin").success).toBe(false);
    expect(
      parseGoogleAuthIntent(
        JSON.stringify({ role: "admin", next: null, issuedAt: now }),
        now,
      ),
    ).toBeNull();
  });

  it("rejects expired, future and malformed intents", () => {
    const raw = encodeGoogleAuthIntent({ role: "creator", next: null, issuedAt: now });
    expect(parseGoogleAuthIntent(raw, now + 11 * 60_000)).toBeNull();
    expect(parseGoogleAuthIntent(raw, now - 2 * 60_000)).toBeNull();
    expect(parseGoogleAuthIntent("not-json", now)).toBeNull();
  });

  it("drops open redirects carried in the cookie", () => {
    const raw = JSON.stringify({
      role: "creator",
      next: "//evil.example",
      issuedAt: now,
    });
    expect(parseGoogleAuthIntent(raw, now)).toMatchObject({
      role: "creator",
      next: null,
    });
  });

  it("keeps the intent cookie httpOnly and secure only over HTTPS", () => {
    expect(googleAuthCookieOptions("https://example.com")).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
    expect(googleAuthCookieOptions("http://localhost:3000")).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });
  });
});
