"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useSyncExternalStore } from "react";
import { cn } from "cn";

type NavLinkProps = React.ComponentProps<typeof Link> & {
  exact?: boolean;
};

const baseClasses =
  "rounded-full px-3 py-2 text-sm font-medium transition-all duration-300";
const inactiveClasses =
  "text-muted-foreground hover:bg-secondary/60 hover:text-foreground";
const activeClasses =
  "bg-secondary text-foreground shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--foreground)_6%,transparent)]";

function isActive(pathname: string, href: string, exact: boolean) {
  if (href === "/") return pathname === href;
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

// The pathname doesn't emit change events — it is read from the router on
// each render, which is enough for navigation-driven updates.
function subscribe() {
  return () => {};
}

function getServerSnapshot() {
  return false;
}

/**
 * Pathname-aware pill link. usePathname() is only available at runtime, so
 * the read streams behind an internal <Suspense> boundary. During hydration
 * useSyncExternalStore uses the server snapshot (inactive), then switches to
 * the real client snapshot — so the markup always matches without a flash.
 */
export function NavLink({
  href,
  exact = false,
  className,
  children,
  ...props
}: NavLinkProps) {
  return (
    <Suspense
      fallback={
        <Link
          href={href}
          data-slot="nav-link"
          className={cn(baseClasses, inactiveClasses, className)}
          {...props}
        >
          {children}
        </Link>
      }
    >
      <ActiveLink
        href={href}
        exact={exact}
        className={className}
        {...props}
      >
        {children}
      </ActiveLink>
    </Suspense>
  );
}

function ActiveLink({
  href,
  exact = false,
  className,
  children,
  ...props
}: NavLinkProps) {
  const pathname = usePathname();
  const target = typeof href === "string" ? href : "";
  const active = useSyncExternalStore(
    subscribe,
    () => isActive(pathname, target, exact),
    getServerSnapshot,
  );

  return (
    <Link
      href={href}
      data-slot="nav-link"
      aria-current={active ? "page" : undefined}
      data-active={active || undefined}
      className={cn(
        baseClasses,
        active ? activeClasses : inactiveClasses,
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
