"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircleIcon, Loader2Icon, MailCheckIcon } from "lucide-react";

import { forgotPassword, type AuthFormState } from "@/app/(auth)/actions";
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
import { forgotPasswordSchema } from "@/lib/validations/auth";
import type * as z from "zod";

type ForgotValues = z.output<typeof forgotPasswordSchema>;

const initialState: AuthFormState = {
  error: null,
  fieldErrors: {},
  message: null,
};

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    forgotPassword,
    initialState,
  );

  const form = useForm<ForgotValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const serverErrorsApplied = useRef<string>("");
  useEffect(() => {
    const key = JSON.stringify(state.fieldErrors);
    if (key === serverErrorsApplied.current) return;
    serverErrorsApplied.current = key;
    for (const [name, messages] of Object.entries(state.fieldErrors)) {
      if (messages?.[0]) {
        form.setError(name as keyof ForgotValues, {
          type: "server",
          message: messages[0],
        });
      }
    }
  }, [state.fieldErrors, form]);

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <h1 className="text-xl font-semibold tracking-tight">
        Reset your password
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        We&apos;ll email you a link to set a new password.
      </p>

      {state.error ? (
        <Alert variant="destructive" className="mt-4">
          <AlertCircleIcon />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.message ? (
        <Alert className="mt-4">
          <MailCheckIcon />
          <AlertTitle>Check your email</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Form {...form}>
        <form action={formAction} className="mt-6 grid gap-4" noValidate>
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

          <Button
            type="submit"
            disabled={isPending || Boolean(state.message)}
            className="w-full"
          >
            {isPending ? (
              <>
                <Loader2Icon className="animate-spin" />
                Sending…
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>
      </Form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
