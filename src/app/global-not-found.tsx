import "./globals.css";

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you were looking for does not exist.",
};

/** Full-document 404 for URLs that do not match any route. Next.js skips the
 *  root layout here, so styles are imported and html/body are explicit. */
export default function GlobalNotFound() {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            404
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            That address does not match any page in the marketplace.
          </p>
          <Link
            href="/"
            className="mt-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back to home
          </Link>
        </div>
      </body>
    </html>
  );
}
