import * as z from "zod";

/**
 * `z.url()` also accepts non-HTTP schemes such as `javascript:` and
 * `data:`. Every user-supplied URL in this app is rendered in an
 * `<img src>`, `<a href>` or `<Link href>`, so restrict inputs to HTTP(S).
 */
export const httpUrlSchema = z.url({
  protocol: /^https?$/,
  error: "Enter a valid HTTP(S) URL.",
});

/** Empty string is how the forms represent "no URL yet". */
export const optionalHttpUrlSchema = z.union([httpUrlSchema, z.literal("")]);
