import * as z from "zod";

import { uuidSchema } from "@/lib/validations/ids";
import { optionalHttpUrlSchema } from "@/lib/validations/url";
import { collaborationTermsSchema } from "@/lib/validations/collaboration";
import {
  CAMPAIGN_STATUSES,
  COLLABORATION_TYPES,
} from "@/types/campaign.types";
import { COLLABORATION_STATUSES } from "@/types/collaboration.types";

/**
 * Business forms submit FormData, so numbers are strings and empty
 * optional fields are "". These schemas normalise values before they
 * reach a service or the database.
 */

/** Mirrors the platforms CHECK constraint on public.campaigns. */
export const CAMPAIGN_PLATFORMS = [
  "instagram",
  "youtube",
  "facebook",
  "tiktok",
  "x",
  "linkedin",
  "other",
] as const;

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, { error: `${label} must be ${max} characters or fewer.` })
    .transform((value) => value || null);

const budgetSchema = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .refine((value) => value === null || /^\d+(\.\d{1,2})?$/.test(value), {
    error: "Enter a valid amount with up to two decimal places.",
  })
  .transform((value) => (value === null ? null : Number(value)));

const optionalDateSchema = z
  .union([z.iso.date({ error: "Use a valid date." }), z.literal("")])
  .transform((value) => value || null);

/** Company details entered during onboarding and edited on the profile page. */
export const businessProfileSchema = z.object({
  company_name: z
    .string()
    .trim()
    .min(2, { error: "Enter your company name (at least 2 characters)." })
    .max(120, { error: "Company name must be 120 characters or fewer." }),
  website: optionalHttpUrlSchema.transform((value) => value || null),
  description: optionalText(1000, "Description"),
  industry: optionalText(80, "Industry"),
});

/** Shared campaign fields; status differs between create and update. */
const campaignBaseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, { error: "Enter a campaign title (at least 3 characters)." })
    .max(200, { error: "Title must be 200 characters or fewer." }),
  description: z
    .string()
    .trim()
    .min(10, { error: "Describe the campaign in at least 10 characters." })
    .max(5000, { error: "Description must be 5,000 characters or fewer." }),
  category: z
    .string()
    .trim()
    .min(2, { error: "Enter a category." })
    .max(80, { error: "Category must be 80 characters or fewer." }),
  platforms: z
    .array(z.enum(CAMPAIGN_PLATFORMS))
    .min(1, { error: "Select at least one platform." }),
  collaboration_type: z.enum(COLLABORATION_TYPES, {
    error: "Choose a collaboration type.",
  }),
  budget_min: budgetSchema,
  budget_max: budgetSchema,
  currency: z
    .string()
    .trim()
    .regex(/^[a-zA-Z]{3}$/, { error: "Currency must be a 3-letter code." })
    .transform((value) => value.toUpperCase()),
  deliverables: z
    .string()
    .trim()
    .max(2000, { error: "Deliverables must be 2,000 characters or fewer." })
    .transform((value) =>
      value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    )
    .refine((lines) => lines.length > 0, {
      error: "Add at least one deliverable (one per line).",
    }),
  application_deadline: optionalDateSchema,
  location: optionalText(120, "Location"),
});

/** RLS only permits new campaigns in draft or published status. */
export const campaignCreateSchema = campaignBaseSchema
  .extend({ status: z.enum(["draft", "published"]) })
  .refine(
    (values) =>
      values.budget_max === null ||
      values.budget_min === null ||
      values.budget_max >= values.budget_min,
    { path: ["budget_max"], error: "Maximum budget cannot be below minimum." },
  );

export const campaignUpdateSchema = campaignBaseSchema
  .extend({ status: z.enum(CAMPAIGN_STATUSES) })
  .refine(
    (values) =>
      values.budget_max === null ||
      values.budget_min === null ||
      values.budget_max >= values.budget_min,
    { path: ["budget_max"], error: "Maximum budget cannot be below minimum." },
  );

/** Decisions accepted from a business reviewing an application. */
export const applicationDecisionSchema = z.enum([
  "shortlisted",
  "accepted",
  "rejected",
]);

/** Invitations are immutable after insert, so the message is validated here. */
export const collaborationInvitationSchema = z.object({
  message: z
    .string()
    .trim()
    .min(10, { error: "Write a short invitation message (at least 10 characters)." })
    .max(1000, { error: "Invitation messages must be 1,000 characters or fewer." }),
});

/** Statuses a business may submit; the service and DB trigger both
 *  re-check the current status before accepting a transition. */
export const businessCollaborationStatusSchema = z.enum(COLLABORATION_STATUSES);

/** Terms use the same FormData schema as the creator side. */
export const businessCollaborationTermsSchema = collaborationTermsSchema;

const deliverableDraftSchema = z.object({
  id: uuidSchema,
  title: z
    .string()
    .trim()
    .min(1, { error: "Enter a deliverable title." })
    .max(200, { error: "Deliverable titles must be 200 characters or fewer." }),
  due_date: z
    .union([z.iso.date({ error: "Use a valid YYYY-MM-DD date." }), z.literal("")])
    .transform((value) => value || null),
});

/** The editor sends one JSON string because deliverables are a repeated,
 *  user-orderable list inside FormData. */
export const businessDeliverablesSchema = z
  .object({
    deliverables: z
      .string()
      .min(1, { error: "Add at least one deliverable." })
      .transform((raw, ctx) => {
        try {
          return JSON.parse(raw) as unknown;
        } catch {
          ctx.addIssue({
            code: "custom",
            message: "Deliverables could not be read.",
          });
          return z.NEVER;
        }
      })
      .pipe(
        z
          .array(deliverableDraftSchema)
          .min(1, { error: "Add at least one deliverable." })
          .max(25, { error: "Use 25 deliverables or fewer." }),
      ),
  })
  .refine(
    (values) =>
      new Set(values.deliverables.map((deliverable) => deliverable.id)).size ===
      values.deliverables.length,
    { path: ["deliverables"], error: "Each deliverable needs a unique id." },
  );

export type BusinessProfileValues = z.output<typeof businessProfileSchema>;
export type CampaignValues = z.output<typeof campaignUpdateSchema>;
export type CollaborationInvitationValues = z.output<
  typeof collaborationInvitationSchema
>;
export type BusinessCollaborationTermsValues = z.output<
  typeof businessCollaborationTermsSchema
>;
export type BusinessDeliverableDraftValues = z.output<
  typeof deliverableDraftSchema
>;
