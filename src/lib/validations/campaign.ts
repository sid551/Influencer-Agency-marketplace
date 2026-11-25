import * as z from "zod";

/**
 * Campaign application payloads arrive from FormData, so every field is
 * initially a string; the schema trims and transforms them for the DB.
 */
export const campaignApplicationSchema = z.object({
  proposal: z
    .string()
    .trim()
    .min(50, { error: "Your proposal must be at least 50 characters." })
    .max(2000, { error: "Proposal must be 2,000 characters or fewer." }),
  why_suitable: z
    .string()
    .trim()
    .max(1000, { error: "Why suitable must be 1,000 characters or fewer." })
    .optional()
    .nullable(),
  expected_price: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, {
      error: "Enter a valid price with up to two decimal places.",
    })
    .transform((value) => Number(value)),
  currency: z
    .string()
    .trim()
    .regex(/^[a-zA-Z]{3}$/, { error: "Currency must be a 3-letter code." })
    .transform((value) => value.toUpperCase()),
});

export type CampaignApplicationValues = z.infer<
  typeof campaignApplicationSchema
>;
