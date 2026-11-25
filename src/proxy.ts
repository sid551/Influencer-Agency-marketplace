import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { sanitizeNextPath } from "@/lib/validations/auth";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 proxy (formerly middleware). Runs before every matched
 * request to:
 *   1. refresh the Supabase session cookies, and
 *   2. gate routes optimistically (redirects below).
 *
 * This is only a convenience layer — every Server Component / Server
 * Action / Route Handler still verifies the session itself through
 * src/lib/auth/session.ts. Role-specific redirects (creator vs
 * business) happen in the /creator layout, since the proxy does not
 * query the database.
 *
 * Note: the spec listed `src/middleware.ts`; Next.js 16 deprecated that
 * convention in favour of `proxy.ts`, so we follow the framework.
 */
export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  const signedIn = userId !== null;
  const isAuthPage =
    pathname === "/login" || pathname === "/signup";

  // 1. Protected creator area: require a session.
  if (!signedIn && (pathname === "/creator" || pathname.startsWith("/creator/"))) {
    const next = encodeURIComponent(`${pathname}${search}`);
    return NextResponse.redirect(
      new URL(`/login?next=${next}`, request.url),
    );
  }

  // 2. Auth pages: signed-in users don't need them again.
  //    (/reset-password is deliberately excluded — it requires the
  //    session created by the email link.)
  if (signedIn && isAuthPage) {
    const next = sanitizeNextPath(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(next ?? "/creator", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every route except static assets. API routes are included so
     * session cookies stay fresh for Route Handlers and Server Actions.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
