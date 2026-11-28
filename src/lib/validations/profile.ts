import * as z from "zod";
import { optionalHttpUrlSchema } from "@/lib/validations/url";
import { NICHE_OPTIONS } from "@/types/creator.types";

/**
 * Profile edit validation. Mirrors the column-level UPDATE grant on
 * public.profiles (full_name, username, avatar_url, city, state, phone)
 * plus the creator's relational niche set. Nothing else may be changed
 * by the owner.
 */

const nicheArray = z
  .array(z.enum(NICHE_OPTIONS))
  .min(1, { error: "Pick at least one niche." })
  .max(5, { error: "Pick at most 5 niches." })
  .refine((values) => new Set(values).size === values.length, {
    error: "Remove duplicate niches before saving.",
  });

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
  niches: nicheArray,
  primaryNiche: z.enum(NICHE_OPTIONS, {
    error: "Choose a primary niche.",
  }),
}).refine((values) => values.niches.includes(values.primaryNiche), {
  path: ["primaryNiche"],
  error: "Your primary niche must be one of your selected niches.",
});

export type ProfileEditValues = z.infer<typeof profileEditSchema>;
