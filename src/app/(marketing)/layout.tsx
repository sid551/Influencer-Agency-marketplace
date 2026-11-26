import Link from "next/link";

/**
 * Shared header/footer for the public marketing pages, including the
 * entry points to login and signup.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-[0_6px_16px_color-mix(in_srgb,var(--primary)_25%,transparent)] transition-transform group-hover:-rotate-6">
              CM
            </span>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Creator Marketplace
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/about"
              className="rounded-full px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="rounded-full px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
            >
              Contact
            </Link>
            <Link
              href="/login"
              className="rounded-full px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="ml-1 rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground shadow-[0_6px_16px_color-mix(in_srgb,var(--primary)_20%,transparent)] transition-all hover:-translate-y-0.5 hover:bg-primary/90"
            >
              Join free
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="border-t border-border/70 bg-card/40">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              CM
            </span>
            <span className="font-medium text-foreground">
              Creator Marketplace
            </span>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/about" className="hover:text-foreground">
              About
            </Link>
            <Link href="/contact" className="hover:text-foreground">
              Contact
            </Link>
            <Link href="/login" className="hover:text-foreground">
              Log in
            </Link>
            <Link href="/signup" className="hover:text-foreground">
              Join free
            </Link>
          </div>
          <p className="text-xs">Made for better collaborations.</p>
        </div>
      </footer>
    </div>
  );
}
