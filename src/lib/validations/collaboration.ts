import * as z from "zod";

import { COLLABORATION_STATUSES } from "@/types/collaboration.types";
import { optionalHttpUrlSchema } from "@/lib/validations/url";

/**
 * Payloads for the creator's collaboration and messaging flows. FormData
 * fields arrive as strings, so numeric/date conversion happens in the
 * Server Action after validation (as with the other validation modules).
 * Constraints mirror the CHECK constraints in the initial schema migration.
 */

export const messageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, { error: "Enter a message." })
    .max(10000, { error: "Messages must be 10,000 characters or fewer." }),
});

export const collaborationTermsSchema = z.object({
  terms: z
    .string()
    .trim()
    .max(5000, { error: "Terms must be 5,000 characters or fewer." })
    .optional(),
  agreed_price: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, {
      error: "Enter a valid price with up to two decimal places.",
    }),
  currency: z
    .string()
    .trim()
    .regex(/^[a-zA-Z]{3}$/, { error: "Currency must be a 3-letter code." }),
  deadline: z.iso.date({ error: "Use a valid YYYY-MM-DD deadline." }).optional(),
});

export const deliverableSubmissionSchema = z.object({
  asset_url: z
    .string()
    .trim()
    .max(2000, { error: "Link must be 2,000 characters or fewer." })
    .pipe(optionalHttpUrlSchema)
    .optional(),
});

/** Statuses a creator may request; the DB trigger is the final authority. */
export const creatorCollaborationStatusSchema = z.enum(COLLABORATION_STATUSES);

export type CollaborationTermsValues = z.infer<typeof collaborationTermsSchema>;
export type MessageValues = z.infer<typeof messageSchema>;
