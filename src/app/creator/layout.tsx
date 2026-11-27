import { Suspense } from "react";
import { connection } from "next/server";
import {
  Bell,
  ClipboardList,
  Compass,
  Handshake,
  Images,
  MessagesSquare,
  Settings,
  UserRound,
} from "lucide-react";

import { requireCreator } from "@/lib/auth/session";
import { UserMenu, UserMenuSkeleton } from "@/components/creator/user-menu";
import { UnreadMessagesBadge } from "@/components/creator/unread-messages-badge";
import { UnreadNotificationsBadge } from "@/components/creator/unread-notifications-badge";
import {
  AppSidebar,
  type SidebarSection,
} from "@/components/layout/app-sidebar";
import { MobileNavShell } from "@/components/layout/mobile-nav-shell";

const sidebarBadgeClass =
  "bg-sidebar text-sidebar-foreground ring-1 ring-sidebar-foreground/20";

/**
 * Shell for all /creator routes.
 *
 * The sidebar user menu reads the session, so it streams in behind a
 * <Suspense> boundary (Cache Components rule). requireCreator() inside
 * it also redirects business accounts away early — but every page
 * still performs its own check when loading data.
 */
export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sections: SidebarSection[] = [
    {
      label: "Workspace",
      items: [
        { href: "/creator/discover", label: "Discover", icon: Compass },
        { href: "/creator/applications", label: "Applications", icon: ClipboardList },
        { href: "/creator/collaborations", label: "Collaborations", icon: Handshake },
      ],
    },
    {
      label: "Inbox",
      items: [
        {
          href: "/creator/messages",
          label: "Messages",
          icon: MessagesSquare,
          trailing: (
            <Suspense fallback={null}>
              <UnreadMessagesBadge className={sidebarBadgeClass} />
            </Suspense>
          ),
        },
        {
          href: "/creator/notifications",
          label: "Notifications",
          icon: Bell,
          trailing: (
            <Suspense fallback={null}>
              <UnreadNotificationsBadge className={sidebarBadgeClass} />
            </Suspense>
          ),
        },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/creator/profile", label: "Profile & verification", icon: UserRound },
        { href: "/creator/portfolio", label: "Portfolio", icon: Images },
        { href: "/creator/settings", label: "Settings", icon: Settings },
      ],
    },
  ];

  return (
    <div className="min-h-screen lg:pl-72">
      <MobileNavShell
        homeHref="/creator/discover"
        brandLabel="Creator Marketplace"
        workspaceLabel="Creator studio"
      >
        <AppSidebar
          sections={sections}
          user={
            <Suspense fallback={<UserMenuSkeleton showIdentity />}>
              <CreatorSidebarUser />
            </Suspense>
          }
        />
      </MobileNavShell>
      <main className="flex-1">{children}</main>
    </div>
  );
}

async function CreatorSidebarUser() {
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
      showIdentity
    />
  );
}
