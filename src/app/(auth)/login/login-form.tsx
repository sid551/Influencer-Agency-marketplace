"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircleIcon, Loader2Icon } from "lucide-react";

import { login, type AuthFormState } from "@/app/(auth)/actions";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { authErrorMessage } from "@/lib/auth-error";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { loginSchema } from "@/lib/validations/auth";
import type * as z from "zod";

type LoginValues = z.output<typeof loginSchema>;

const initialState: AuthFormState = {
  error: null,
  fieldErrors: {},
  message: null,
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const urlError = searchParams.get("error");

  const [state, formAction, isPending] = useActionState(login, initialState);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Server-side field errors (re-validated in the action) surface in RHF.
  const serverErrorsApplied = useRef<string>("");
  useEffect(() => {
    const key = JSON.stringify(state.fieldErrors);
    if (key === serverErrorsApplied.current) return;
    serverErrorsApplied.current = key;
    for (const [name, messages] of Object.entries(state.fieldErrors)) {
      if (messages?.[0]) {
        form.setError(name as keyof LoginValues, {
          type: "server",
          message: messages[0],
        });
      }
    }
  }, [state.fieldErrors, form]);

  const formError = state.error ?? (urlError ? authErrorMessage(urlError) : null);

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-[0_18px_45px_color-mix(in_srgb,var(--foreground)_8%,transparent)] sm:p-7">
      <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Log in to manage your collaborations.
      </p>

      {formError ? (
        <Alert variant="destructive" className="mt-4">
          <AlertCircleIcon />
          <AlertTitle>Log in failed</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <Form {...form}>
        <form
          action={formAction}
          className="mt-6 grid gap-4"
          noValidate
        >
          {next ? <input type="hidden" name="next" value={next} /> : null}

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? (
              <>
                <Loader2Icon className="animate-spin" />
                Logging in…
              </>
            ) : (
              "Log in"
            )}
          </Button>
        </form>
      </Form>

      <div className="mt-6">
        <div className="flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            or
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="mt-4">
          <GoogleAuthButton role="creator" next={next} />
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link
          href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-medium text-primary hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
