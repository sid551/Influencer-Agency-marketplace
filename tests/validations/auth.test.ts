import { describe, expect, it } from "vitest";

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
