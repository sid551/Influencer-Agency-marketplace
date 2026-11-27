import * as z from "zod";

/**
 * FormData currency fields are strings. The marketplace is INR-only, so
 * input is uppercased for compatibility with existing submissions and then
 * restricted to INR with an explicit error message.
 */
export const currencySchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine((value) => value === "INR", { error: "Currency must be INR." })
  // Keep the output type as a plain string for react-hook-form's generics.
  .transform((value): string => value);
