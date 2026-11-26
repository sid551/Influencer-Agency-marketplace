import { Suspense } from "react";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="h-96 animate-pulse rounded-3xl bg-muted" aria-hidden />
      }
    >
      <SignupForm />
    </Suspense>
  );
}
