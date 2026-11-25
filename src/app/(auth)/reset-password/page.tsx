import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";

import { getUser } from "@/lib/auth/session";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = { title: "Set a new password" };

/**
 * The confirm route exchanges the email link for a session before
 * redirecting here, so a signed-in user sees the form. Without a
 * session we show a friendly "link expired" message instead.
 */
export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="h-80 animate-pulse rounded-lg bg-muted" aria-hidden />
      }
    >
      <ResetPasswordGate />
    </Suspense>
  );
}

async function ResetPasswordGate() {
  // Session validation uses Date.now(); defer to request time.
  await connection();
  const user = await getUser();

  if (!user) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">
          Link expired
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This password reset link is no longer valid. Request a new one and
          open it within the hour.
        </p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm />;
}
