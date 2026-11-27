"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { MailIcon, Loader2Icon } from "lucide-react";

import { resendConfirmation, type AuthFormState } from "@/app/(auth)/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const initialState: AuthFormState = {
  error: null,
  fieldErrors: {},
  message: null,
};

export function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [state, formAction, isPending] = useActionState(
    resendConfirmation,
    initialState,
  );

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-[0_18px_45px_color-mix(in_srgb,var(--foreground)_8%,transparent)] sm:p-7">
      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MailIcon className="size-5" />
      </div>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">
        Confirm your email
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {email ? (
          <>
            We sent a confirmation link to{" "}
            <span className="font-medium text-foreground">{email}</span>.
          </>
        ) : (
          "We sent a confirmation link to your email address."
        )}{" "}
        Click the link in the email — you&apos;ll be signed in automatically
        and taken straight to your setup.
      </p>

      <ul className="mt-3 grid gap-1 text-xs text-muted-foreground">
        <li>· Nothing after a few minutes? Look in Spam or Promotions.</li>
        <li>
          · Only one confirmation email goes out at a time — asking again
          resets the wait.
        </li>
        <li>· Wrong address? Use “Use a different email” below.</li>
      </ul>

      {state.error ? (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Could not resend</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.message ? (
        <Alert className="mt-4">
          <AlertTitle>Check your email</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <form action={formAction} className="mt-6 grid gap-3">
        {email ? <input type="hidden" name="email" value={email} /> : null}
        <Button
          type="submit"
          variant="outline"
          disabled={isPending || !email || Boolean(state.message)}
        >
          {isPending ? (
            <>
              <Loader2Icon className="animate-spin" />
              Resending…
            </>
          ) : state.message ? (
            "Email sent"
          ) : (
            "Resend confirmation email"
          )}
        </Button>
        {state.message ? (
          <p className="text-xs text-muted-foreground">
            Didn&apos;t get it? Check spam, or wait a minute before asking for
            another link.
          </p>
        ) : null}
      </form>

      <div className="mt-6 flex items-center justify-between text-sm">
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Back to log in
        </Link>
        <Link
          href="/signup"
          className="text-muted-foreground hover:text-foreground hover:underline"
        >
          Use a different email
        </Link>
      </div>
    </div>
  );
}
