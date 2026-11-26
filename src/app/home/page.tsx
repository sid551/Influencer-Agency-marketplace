import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { getProfile, getUser, homePathForRole } from "@/lib/auth/session";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Redirecting…" };

/**
 * Post-auth landing page. The proxy cannot query the database, so this
 * route resolves the profile role and forwards to the correct dashboard.
 */
export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-md px-4 py-16" aria-hidden>
          <Skeleton className="h-8 w-full" />
        </div>
      }
    >
      <HomeRedirect />
    </Suspense>
  );
}

async function HomeRedirect() {
  // Session checks read the clock, so defer them past prerendering.
  await connection();
  const user = await getUser();
  if (!user) redirect("/login?next=/home");

  const profile = await getProfile(user.id);
  return redirect(homePathForRole(profile?.role));
}
