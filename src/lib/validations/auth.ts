import * as z from "zod";

/**
 * Authentication form schemas.
 *
 * The same schemas run on the client (react-hook-form + zodResolver)
 * and again inside every Server Action — the server never trusts
 * client-side validation. Inputs are trimmed by the action before
 * parsing so the schemas stay pure (no transforms) and the input and
 * output types stay identical for zodResolver.
 */

export const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }),
  password: z.string().min(1, { error: "Enter your password." }),
});

export const signupSchema = z.object({
  role: z.enum(["creator", "business"], { error: "Choose an account type." }),
  fullName: z
    .string()
    .min(2, { error: "Enter your full name (at least 2 characters)." })
    .max(100, { error: "Full name must be 100 characters or fewer." }),
  email: z.email({ error: "Enter a valid email address." }),
  password: z
    .string()
    .min(8, { error: "Use at least 8 characters." })
    .regex(/[a-zA-Z]/, { error: "Include at least one letter." })
    .regex(/[0-9]/, { error: "Include at least one number." }),
});

export const forgotPasswordSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { error: "Use at least 8 characters." })
      .regex(/[a-zA-Z]/, { error: "Include at least one letter." })
      .regex(/[0-9]/, { error: "Include at least one number." }),
    confirmPassword: z.string().min(1, { error: "Confirm your new password." }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    error: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const emailOnlySchema = z.object({
  email: z.email({ error: "Enter a valid email address." }),
});

/** OTP types accepted by the PKCE/token-hash confirmation route. */
export const emailOtpTypeSchema = z.enum([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

/**
 * Only same-origin absolute paths are allowed as post-login redirect
 * targets ("next" query parameter). Blocks open redirects such as
 * "//evil.com" or "https://evil.com".
 */
export function sanitizeNextPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return null;
  }
  if (/[\s\\]/.test(value)) return null;
  return value;
}
