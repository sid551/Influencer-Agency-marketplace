import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Result of the proxy session refresh: the response with refreshed
 * cookies, plus the (optimistically validated) user id when a session
 * exists. Route-gating decisions live in src/proxy.ts.
 */
export interface ProxySession {
  response: NextResponse;
  userId: string | null;
}

/**
 * Refreshes the Supabase auth session on every matched request and keeps
 * the session cookies in sync with the response.
 *
 * Called from src/proxy.ts (Next.js 16 renamed middleware to proxy).
 * This is an optimistic check only — Server Components, Server Actions
 * and Route Handlers still verify the session themselves via
 * src/lib/auth/session.ts.
 */
export async function updateSession(
  request: NextRequest,
): Promise<ProxySession> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill in your values.",
    );
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: do not run code between createServerClient() and
  // auth.getUser() — the session must be validated first so the cookies
  // written above are attached to the response.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response: supabaseResponse, userId: user?.id ?? null };
}
