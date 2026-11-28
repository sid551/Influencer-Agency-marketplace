import * as z from "zod";
import {
  COLLABORATION_PREFERENCES,
  CONTENT_TYPE_OPTIONS,
  LANGUAGE_OPTIONS,
  NICHE_OPTIONS,
  SOCIAL_PLATFORMS,
} from "@/types/creator.types";
import { optionalHttpUrlSchema } from "@/lib/validations/url";

/**
 * Creator onboarding — per-step validation.
 *
 * The wizard has 12 steps (mirrored by creator_profiles.onboarding_step,
 * which stores how many steps are complete). Each step owns a schema
 * that validates only that step's fields; unknown keys are stripped,
 * so the server can safely receive the whole form state and parse it
 * with the current step's schema.
 */

export const TOTAL_ONBOARDING_STEPS = 12;

const fullName = z
  .string()
  .min(2, { error: "Enter your full name (at least 2 characters)." })
  .max(100, { error: "Full name must be 100 characters or fewer." });

/** Mirrors the profiles.username CHECK constraint exactly. */
const username = z
  .string()
  .regex(/^[A-Za-z0-9_]{3,30}$/, {
    error: "Use 3–30 letters, numbers or underscores.",
  });

/** Empty string means "no photo yet" (mapped to NULL server-side). */
const avatarUrl = optionalHttpUrlSchema;

const city = z
  .string()
  .min(2, { error: "Enter your city." })
  .max(80, { error: "City must be 80 characters or fewer." });

const state = z
  .string()
  .min(2, { error: "Enter your state or region." })
  .max(80, { error: "State must be 80 characters or fewer." });

const bio = z
  .string()
  .min(60, { error: "Write at least 60 characters about yourself." })
  .max(1000, { error: "Bio must be 1000 characters or fewer." });

const phone = z.union(
  [
    z.literal(""),
    z.string().regex(/^\+?[0-9()\s-]{7,20}$/, {
      error: "Enter a valid phone number (7–20 digits, +, -, spaces, parentheses).",
    }),
  ],
  { error: "Enter a valid phone number." },
);

function stringOptions(options: readonly string[], min: number, max: number, label: string) {
  return z
    .array(z.enum(options as [string, ...string[]]))
    .min(min, { error: `Pick at least ${min === 1 ? "one" : min} ${label}.` })
    .max(max, { error: `Pick at most ${max} ${label}.` });
}

export const onboardingStepSchemas = {
  1: z.object({ fullName }),
  2: z.object({ username }),
  3: z.object({ avatarUrl }),
  4: z.object({ city, state }),
  5: z.object({ bio }),
  // Step 6: one primary niche (also stored relationally) plus up to four
  // secondary niches. The primary must be part of the selection.
  6: z
    .object({
      niches: stringOptions(NICHE_OPTIONS, 1, 5, "niches"),
      primaryNiche: z.enum(NICHE_OPTIONS, {
        error: "Choose a primary niche.",
      }),
    })
    .refine((values) => values.niches.includes(values.primaryNiche), {
      path: ["primaryNiche"],
      error: "Your primary niche must be one of your selected niches.",
    }),
  7: z.object({ languages: stringOptions(LANGUAGE_OPTIONS, 1, 6, "languages") }),
  8: z.object({ contentTypes: stringOptions(CONTENT_TYPE_OPTIONS, 1, 6, "content types") }),
  // Step 9 (social accounts) is saved through its own add/remove
  // actions, so its schema has no fields.
  9: z.object({}),
  10: z.object({
    collaborationPreferences: stringOptions(
      COLLABORATION_PREFERENCES,
      1,
      4,
      "preferences",
    ),
  }),
  11: z.object({ phone }),
  // Step 12 is the review screen — nothing new is written here.
  12: z.object({}),
} as const;

export type OnboardingStepNumber = keyof typeof onboardingStepSchemas;

type StepOutput<N extends OnboardingStepNumber> = z.output<
  (typeof onboardingStepSchemas)[N]
>;

/**
 * The complete shape of the wizard form. `avatarUrl` and `phone` are
 * empty strings until the user fills them in; the server maps "" to
 * NULL when persisting.
 */
export interface OnboardingValues
  extends StepOutput<1>,
    StepOutput<2>,
    StepOutput<3>,
    StepOutput<4>,
    StepOutput<5>,
    StepOutput<6>,
    StepOutput<7>,
    StepOutput<8>,
    StepOutput<10>,
    StepOutput<11> {}

export function getStepSchema(step: number) {
  if (!Number.isInteger(step) || step < 1 || step > TOTAL_ONBOARDING_STEPS) {
    return null;
  }
  return onboardingStepSchemas[step as OnboardingStepNumber];
}

/** Step 9 — adding a social account through its own action. */
export const socialAccountSchema = z.object({
  platform: z.enum([...SOCIAL_PLATFORMS] as [string, ...string[]], {
    error: "Choose a platform.",
  }),
  username: z
    .string()
    .regex(/^[A-Za-z0-9._-]{2,100}$/, {
      error:
        "Use 2–100 characters: letters, numbers, dots, dashes or underscores.",
    }),
});
