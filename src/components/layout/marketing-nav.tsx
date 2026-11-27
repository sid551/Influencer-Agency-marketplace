"use client";

import Link from "next/link";
import { useState } from "react";
import { MenuIcon, XIcon } from "lucide-react";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/login", label: "Log in" },
];

/** Compact navigation: inline links on larger screens, a simple menu on mobile. */
export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="hidden items-center gap-1 text-sm sm:flex">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-full px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
        <Link
          href="/signup"
          className="ml-1 rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground shadow-[0_6px_16px_color-mix(in_srgb,var(--primary)_20%,transparent)] transition-all hover:-translate-y-0.5 hover:bg-primary/90"
        >
          Join free
        </Link>
      </nav>

      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="marketing-mobile-menu"
        onClick={() => setOpen((current) => !current)}
        className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground sm:hidden"
      >
        {open ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
      </button>

      {open ? (
        <nav
          id="marketing-mobile-menu"
          className="absolute inset-x-5 top-16 z-40 grid gap-1 rounded-2xl border border-border bg-card p-2 shadow-xl sm:hidden"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl px-4 py-3 text-sm font-medium hover:bg-secondary/70"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/signup"
            className="mt-1 rounded-xl bg-primary px-4 py-3 text-center text-sm font-medium text-primary-foreground"
          >
            Join free
          </Link>
        </nav>
      ) : null}
    </>
  );
}
