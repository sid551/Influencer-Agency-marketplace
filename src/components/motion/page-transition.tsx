"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";

/**
 * Remounts route content whenever the path changes so every navigation
 * fades in with the shared `fx-page` entrance. The wrapper mimics the
 * body's flex-column behaviour so flex-1 children keep working.
 *
 * usePathname() is runtime-only, so the shell streams behind an internal
 * Suspense boundary (same pattern as NavLink): the server renders children
 * in a plain wrapper, and the animated keyed shell takes over after
 * hydration.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex flex-1 flex-col">{children}</div>}>
      <PageShell>{children}</PageShell>
    </Suspense>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="fx-page flex flex-1 flex-col">
      {children}
    </div>
  );
}
