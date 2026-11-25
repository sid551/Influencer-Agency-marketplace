import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="h-96 animate-pulse rounded-lg bg-muted" aria-hidden />
      }
    >
      <LoginForm />
    </Suspense>
  );
}
