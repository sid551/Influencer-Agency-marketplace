"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircleIcon, Loader2Icon } from "lucide-react";

import { signup, type AuthFormState } from "@/app/(auth)/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { signupSchema } from "@/lib/validations/auth";
import { cn } from "cn";
import type * as z from "zod";

type SignupValues = z.output<typeof signupSchema>;

const initialState: AuthFormState = {
  error: null,
  fieldErrors: {},
  message: null,
};

const ROLE_OPTIONS = [
  {
    value: "creator" as const,
    title: "Creator",
    description: "I make content and want brand collaborations.",
  },
  {
    value: "business" as const,
    title: "Business",
    description: "I want to hire creators for campaigns.",
  },
];

export function SignupForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [state, formAction, isPending] = useActionState(signup, initialState);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: "creator",
      fullName: "",
      email: "",
      password: "",
    },
  });

  const serverErrorsApplied = useRef<string>("");
  useEffect(() => {
    const key = JSON.stringify(state.fieldErrors);
    if (key === serverErrorsApplied.current) return;
    serverErrorsApplied.current = key;
    for (const [name, messages] of Object.entries(state.fieldErrors)) {
      if (messages?.[0]) {
        form.setError(name as keyof SignupValues, {
          type: "server",
          message: messages[0],
        });
      }
    }
  }, [state.fieldErrors, form]);

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <h1 className="text-xl font-semibold tracking-tight">
        Create your account
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Join as a creator or a business.
      </p>

      {state.error ? (
        <Alert variant="destructive" className="mt-4">
          <AlertCircleIcon />
          <AlertTitle>Sign up failed</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <Form {...form}>
        <form action={formAction} className="mt-6 grid gap-4" noValidate>
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                {/* Backs the button-based picker so the value is part
                    of the submitted FormData. */}
                <input type="hidden" name={field.name} value={field.value} readOnly />
                <FormLabel>I am a…</FormLabel>
                <div className="grid grid-cols-2 gap-3" role="radiogroup">
                  {ROLE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={field.value === option.value}
                      onClick={() => field.onChange(option.value)}
                      className={cn(
                        "rounded-lg border p-3 text-left transition-colors outline-none",
                        "focus-visible:ring-3 focus-visible:ring-ring/50",
                        field.value === option.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      <span className="block text-sm font-medium">
                        {option.title}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </button>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="name"
                    placeholder="Your name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  At least 8 characters with a letter and a number.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? (
              <>
                <Loader2Icon className="animate-spin" />
                Creating account…
              </>
            ) : (
              "Sign up"
            )}
          </Button>
        </form>
      </Form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-medium text-primary hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
