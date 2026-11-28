"use client";

import { useActionState } from "react";
import { Loader2Icon } from "lucide-react";

import {
  startGoogleSignIn,
  type AuthFormState,
} from "@/app/(auth)/actions";
import type { GoogleRole } from "@/lib/auth/google";
import { Button } from "@/components/ui/button";

const initialState: AuthFormState = {
  error: null,
  fieldErrors: {},
  message: null,
};

/**
 * Submits to a Server Action instead of starting OAuth in the browser so the
 * role/return-path intent is written as an httpOnly cookie before redirecting.
 */
export function GoogleAuthButton({
  role,
  next,
  label = "Continue with Google",
}: {
  role: GoogleRole;
  next?: string | null;
  label?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    startGoogleSignIn,
    initialState,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="role" value={role} readOnly />
      {next ? <input type="hidden" name="next" value={next} readOnly /> : null}

      <Button
        type="submit"
        variant="outline"
        disabled={isPending}
        className="w-full"
      >
        {isPending ? (
          <Loader2Icon className="animate-spin" />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-5 place-items-center rounded-full bg-white text-[13px] font-bold leading-none"
          >
            <span className="bg-gradient-to-br from-[#4285F4] via-[#34A853] to-[#EA4335] bg-clip-text text-transparent">
              G
            </span>
          </span>
        )}
        {isPending ? "Opening Google…" : label}
      </Button>

      {state.error ? (
        <p className="mt-2 text-center text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
