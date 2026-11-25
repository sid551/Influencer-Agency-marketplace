import * as z from "zod";
import { optionalHttpUrlSchema } from "@/lib/validations/url";

/**
 * Profile edit validation. Mirrors the column-level UPDATE grant on
 * public.profiles (full_name, username, avatar_url, city, state, phone).
 * Nothing else may be changed by the owner.
 */

export const profileEditSchema = z.object({
  fullName: z
    .string()
    .min(2, { error: "Enter your full name (at least 2 characters)." })
    .max(100, { error: "Full name must be 100 characters or fewer." }),
  username: z
    .string()
    .min(3, { error: "Username must be at least 3 characters." })
    .max(30, { error: "Username must be 30 characters or fewer." })
    .regex(/^[A-Za-z0-9_]{3,30}$/, {
      error: "Use 3–30 letters, numbers or underscores.",
    }),
  avatarUrl: optionalHttpUrlSchema.optional(),
  city: z
    .string()
    .min(2, { error: "Enter your city." })
    .max(80, { error: "City must be 80 characters or fewer." })
    .optional(),
  state: z
    .string()
    .min(2, { error: "Enter your state or region." })
    .max(80, { error: "State must be 80 characters or fewer." })
    .optional(),
  phone: z.union(
    [
      z.literal(""),
      z.string().regex(/^\+?[0-9()\s-]{7,20}$/, {
        error: "Enter a valid phone number (7–20 digits, +, -, spaces, parentheses).",
      }),
    ],
    { error: "Enter a valid phone number." },
  ).optional(),
});

export type ProfileEditValues = z.infer<typeof profileEditSchema>;
