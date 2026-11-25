"use client";

import "./globals.css";

import { useEffect } from "react";

/** Last-resort fallback for errors in the root layout. This file replaces the
 *  root document, so it defines its own html/body and imports global styles. */
export default function GlobalError({
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
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <title>Something went wrong | Creator Marketplace</title>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            The application hit an unexpected error. Reloading the page may
            resolve it.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
