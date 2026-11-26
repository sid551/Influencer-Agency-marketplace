import { Suspense } from "react";
import { connection } from "next/server";
import {
  Bell,
  ClipboardList,
  Handshake,
  LayoutDashboard,
  Mail,
  Megaphone,
  MessagesSquare,
  UserRound,
} from "lucide-react";

import { requireBusiness } from "@/lib/auth/session";
import { UserMenu, UserMenuSkeleton } from "@/components/creator/user-menu";
import { UnreadMessagesBadge } from "@/components/business/unread-messages-badge";
import { UnreadNotificationsBadge } from "@/components/business/unread-notifications-badge";
import {
  AppSidebar,
  type SidebarSection,
} from "@/components/layout/app-sidebar";
import { MobileNavShell } from "@/components/layout/mobile-nav-shell";

const sidebarBadgeClass =
  "bg-sidebar text-sidebar-foreground ring-1 ring-sidebar-foreground/20";

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
  const sections: SidebarSection[] = [
    {
      label: "Workspace",
      items: [
        { href: "/business", label: "Dashboard", icon: LayoutDashboard, exact: true },
        { href: "/business/campaigns", label: "Campaigns", icon: Megaphone },
        { href: "/business/applications", label: "Applications", icon: ClipboardList },
        { href: "/business/collaborations", label: "Collaborations", icon: Handshake },
        { href: "/business/invitations", label: "Invitations", icon: Mail },
      ],
    },
    {
      label: "Inbox",
      items: [
        {
          href: "/business/messages",
          label: "Messages",
          icon: MessagesSquare,
          trailing: (
            <Suspense fallback={null}>
              <UnreadMessagesBadge className={sidebarBadgeClass} />
            </Suspense>
          ),
        },
        {
          href: "/business/notifications",
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
      items: [{ href: "/business/profile", label: "Profile", icon: UserRound }],
    },
  ];

  return (
    <div className="min-h-screen lg:pl-72">
      <MobileNavShell
        homeHref="/business"
        brandLabel="Business Marketplace"
        workspaceLabel="Business studio"
      >
        <AppSidebar
          sections={sections}
          user={
            <Suspense fallback={<UserMenuSkeleton showIdentity />}>
              <BusinessSidebarUser />
            </Suspense>
          }
        />
      </MobileNavShell>
      <main className="flex-1">{children}</main>
    </div>
  );
}

async function BusinessSidebarUser() {
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
      showIdentity
    />
  );
}
