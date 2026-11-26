import Link from "next/link";

/**
 * Shared shell for login / signup / password pages: centered card,
 * brand link back home. Pages render static shells; anything reading
 * search params streams in behind a <Suspense> boundary (Cache
 * Components rule).
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-14">
      <div
        className="pointer-events-none absolute top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/70 blur-3xl"
        aria-hidden
      />
      <div className="relative w-full max-w-md">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2.5 text-foreground"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-[0_6px_16px_color-mix(in_srgb,var(--primary)_25%,transparent)]">
            CM
          </span>
          <span className="text-base font-semibold tracking-tight">
            Creator Marketplace
          </span>
        </Link>
        {children}
      </div>
    </div>
  );
}
