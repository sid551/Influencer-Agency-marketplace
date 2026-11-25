import * as z from "zod";
import { PORTFOLIO_MEDIA_TYPES } from "@/types/creator.types";
import { httpUrlSchema } from "@/lib/validations/url";

export const portfolioItemSchema = z.object({
  title: z
    .string()
    .min(1, { error: "Enter a title." })
    .max(200, { error: "Title must be 200 characters or fewer." }),
  description: z
    .string()
    .max(1000, { error: "Description must be 1000 characters or fewer." })
    .optional()
    .nullable(),
  media_type: z.enum(PORTFOLIO_MEDIA_TYPES, {
    error: "Choose a media type.",
  }),
  media_url: httpUrlSchema,
});

export type PortfolioItemValues = z.infer<typeof portfolioItemSchema>;
