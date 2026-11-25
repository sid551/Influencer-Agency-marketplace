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
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 block text-center text-lg font-semibold tracking-tight text-foreground"
        >
          Creator Marketplace
        </Link>
        {children}
      </div>
    </div>
  );
}
