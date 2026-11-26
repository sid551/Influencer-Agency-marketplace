"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Route-level fallback. Production error messages are intentionally generic;
 *  `error.digest` can be matched against server logs when available. */
export default function Error({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        We could not load this page. Try again, or return to the marketplace.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
