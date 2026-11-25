import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for Client Components (browser).
 *
 * Uses the publishable key only. The secret key must never be
 * referenced from this file — it would be bundled for the browser.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill in your values.",
    );
  }

  return createBrowserClient(url, publishableKey);
}
