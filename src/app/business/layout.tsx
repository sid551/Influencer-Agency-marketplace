import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";

import { requireBusiness } from "@/lib/auth/session";
import { UserMenu, UserMenuSkeleton } from "@/components/creator/user-menu";
import { UnreadMessagesBadge } from "@/components/business/unread-messages-badge";
import { UnreadNotificationsBadge } from "@/components/business/unread-notifications-badge";

/**
 * Shell for all /business routes. The session read streams behind
 * Suspense; requireBusiness() redirects creators and admins to their
 * own home page. Every page re-verifies the session when loading data.
 */
export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Link href="/business" className="text-sm font-semibold tracking-tight">
              Business Marketplace
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/business" className="hover:text-foreground">
                Dashboard
              </Link>
              <Link href="/business/campaigns" className="hover:text-foreground">
                Campaigns
              </Link>
              <Link href="/business/applications" className="hover:text-foreground">
                Applications
              </Link>
              <Link
                href="/business/collaborations"
                className="hover:text-foreground"
              >
                Collaborations
              </Link>
              <Link href="/business/invitations" className="hover:text-foreground">
                Invitations
              </Link>
              <Link
                href="/business/messages"
                className="inline-flex items-center gap-1.5 hover:text-foreground"
              >
                Messages
                <Suspense fallback={null}>
                  <UnreadMessagesBadge />
                </Suspense>
              </Link>
              <Link
                href="/business/notifications"
                className="inline-flex items-center gap-1.5 hover:text-foreground"
              >
                Notifications
                <Suspense fallback={null}>
                  <UnreadNotificationsBadge />
                </Suspense>
              </Link>
              <Link href="/business/profile" className="hover:text-foreground">
                Profile
              </Link>
            </nav>
          </div>
          <Suspense fallback={<UserMenuSkeleton />}>
            <BusinessHeaderUser />
          </Suspense>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

async function BusinessHeaderUser() {
  // Supabase's session expiry check reads the clock, so defer it past
  // prerendering of the static shell.
  await connection();
  const { user, profile } = await requireBusiness();
  return (
    <UserMenu
      email={user.email}
      fullName={profile.full_name}
      username={profile.username}
      avatarUrl={profile.avatar_url}
    />
  );
}
