import { Suspense } from "react";
import { VerifyEmailForm } from "./verify-email-form";

export const metadata = { title: "Confirm your email" };

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="h-80 animate-pulse rounded-lg bg-muted" aria-hidden />
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
