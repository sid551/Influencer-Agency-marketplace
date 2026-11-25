import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";

import { requireCreator } from "@/lib/auth/session";
import { UserMenu, UserMenuSkeleton } from "@/components/creator/user-menu";
import { UnreadMessagesBadge } from "@/components/creator/unread-messages-badge";
import { UnreadNotificationsBadge } from "@/components/creator/unread-notifications-badge";

/**
 * Shell for all /creator routes.
 *
 * The header's user menu reads the session, so it streams in behind a
 * <Suspense> boundary (Cache Components rule). requireCreator() inside
 * it also redirects business accounts away early — but every page
 * still performs its own check when loading data.
 */
export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Link
              href="/creator"
              className="text-sm font-semibold tracking-tight"
            >
              Creator Marketplace
            </Link>
            <nav className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
              <Link href="/creator" className="hover:text-foreground">
                Dashboard
              </Link>
              <Link href="/creator/applications" className="hover:text-foreground">
                Applications
              </Link>
              <Link href="/creator/discover" className="hover:text-foreground">
                Discover
              </Link>
              <Link
                href="/creator/collaborations"
                className="hover:text-foreground"
              >
                Collaborations
              </Link>
              <Link
                href="/creator/messages"
                className="inline-flex items-center gap-1.5 hover:text-foreground"
              >
                Messages
                <Suspense fallback={null}>
                  <UnreadMessagesBadge />
                </Suspense>
              </Link>
              <Link
                href="/creator/notifications"
                className="inline-flex items-center gap-1.5 hover:text-foreground"
              >
                Notifications
                <Suspense fallback={null}>
                  <UnreadNotificationsBadge />
                </Suspense>
              </Link>
              <Link href="/creator/profile" className="hover:text-foreground">
                Profile
              </Link>
              <Link href="/creator/verification" className="hover:text-foreground">
                Verification
              </Link>
              <Link href="/creator/portfolio" className="hover:text-foreground">
                Portfolio
              </Link>
              <Link href="/creator/settings" className="hover:text-foreground">
                Settings
              </Link>
            </nav>
          </div>
          <Suspense fallback={<UserMenuSkeleton />}>
            <CreatorHeaderUser />
          </Suspense>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

async function CreatorHeaderUser() {
  // Defer the session read to request time: Supabase's session expiry
  // check calls Date.now(), which can't run during prerendering of the
  // static shell (https://nextjs.org/docs/messages/blocking-prerender-current-time).
  await connection();
  const { user, profile } = await requireCreator();

  return (
    <UserMenu
      email={user.email}
      fullName={profile.full_name}
      username={profile.username}
      avatarUrl={profile.avatar_url}
    />
  );
}
