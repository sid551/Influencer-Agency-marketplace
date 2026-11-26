import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { NavLink } from "@/components/ui/nav-link";

export type SidebarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  trailing?: ReactNode;
};

export type SidebarSection = {
  label: string;
  items: SidebarItem[];
};

/** Server-rendered contents of the app sidebar, shared by both app shells. */
export function AppSidebar({
  sections,
  user,
}: {
  sections: SidebarSection[];
  user: ReactNode;
}) {
  return (
    <>
      <nav className="no-scrollbar flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-3 pb-2 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    exact={item.exact}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm data-[active]:bg-sidebar-primary data-[active]:text-sidebar-primary-foreground"
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.trailing ? (
                      <span className="flex shrink-0 items-center">
                        {item.trailing}
                      </span>
                    ) : null}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-3">{user}</div>
    </>
  );
}
