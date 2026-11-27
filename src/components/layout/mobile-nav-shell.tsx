"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { MenuIcon, XIcon } from "lucide-react";

type MobileNavShellProps = {
  homeHref: string;
  brandLabel: string;
  workspaceLabel: string;
  children: React.ReactNode;
};

/**
 * Responsive frame for the app sidebar. The same server-rendered sidebar
 * content slides in as a drawer on small screens and stays fixed on desktop.
 */
export function MobileNavShell({
  homeHref,
  brandLabel,
  workspaceLabel,
  children,
}: MobileNavShellProps) {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // Return focus to the trigger when the drawer closes (Escape, overlay or
  // navigation), so keyboard users don't land back on a background element.
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      return;
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    menuButtonRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onBreakpointChange = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onBreakpointChange);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onBreakpointChange);
    };
  }, [open]);

  const closeOnNavigation = (event: React.MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("a")) setOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-border/70 bg-background/90 px-5 backdrop-blur-xl lg:hidden">
        <Brand
          homeHref={homeHref}
          brandLabel={brandLabel}
          workspaceLabel={workspaceLabel}
        />
        <button
          ref={menuButtonRef}
          type="button"
          aria-label="Open navigation"
          aria-controls="app-sidebar"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="flex size-10 items-center justify-center rounded-full border border-border bg-background text-foreground outline-none transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <MenuIcon className="size-5" aria-hidden="true" />
        </button>
      </header>

      {open ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
        />
      ) : null}

      <aside
        id="app-sidebar"
        aria-label={`${workspaceLabel} navigation`}
        onClickCapture={closeOnNavigation}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[calc(100vw-3rem)] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-200 lg:z-30 lg:shadow-none",
          open ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
        )}
      >
        <div className="flex min-h-16 items-center justify-between gap-2 border-b border-sidebar-border px-5">
          <Brand
            homeHref={homeHref}
            brandLabel={brandLabel}
            workspaceLabel={workspaceLabel}
          />
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 lg:hidden"
          >
            <XIcon className="size-4" aria-hidden="true" />
          </button>
        </div>
        {children}
      </aside>
    </>
  );
}

function Brand({
  homeHref,
  brandLabel,
  workspaceLabel,
}: Pick<MobileNavShellProps, "homeHref" | "brandLabel" | "workspaceLabel">) {
  return (
    <Link href={homeHref} className="flex min-w-0 items-center gap-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
        CM
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold tracking-tight">
          {brandLabel}
        </span>
        <span className="block truncate font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {workspaceLabel}
        </span>
      </span>
    </Link>
  );
}
