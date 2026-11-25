import * as z from "zod";

/**
 * Server Action arguments are untrusted even when TypeScript says they are
 * strings. Validate every bound row id before it reaches a service.
 */
export const uuidSchema = z.string().uuid({ error: "Invalid identifier." });
