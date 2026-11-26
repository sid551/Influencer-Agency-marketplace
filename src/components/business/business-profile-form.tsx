"use client";

import { useActionState } from "react";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EMPTY_FORM_STATE, type FormActionState } from "@/types/action-state.types";

export interface BusinessProfileFormValues {
  company_name: string;
  website: string;
  description: string;
  industry: string;
}

export function BusinessProfileForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (prev: FormActionState, formData: FormData) => Promise<FormActionState>;
  defaultValues?: BusinessProfileFormValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {!state.ok && state.message ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      {state.ok && state.message ? (
        <p className="text-sm font-medium text-foreground" role="status">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-2">
        <label htmlFor="company_name" className="text-sm font-medium">
          Company name
        </label>
        <Input
          id="company_name"
          name="company_name"
          defaultValue={defaultValues?.company_name ?? ""}
          placeholder="Acme Inc."
          aria-invalid={!!state.fieldErrors.company_name}
          required
        />
        <FieldError messages={state.fieldErrors.company_name} />
      </div>

      <div className="grid gap-2">
        <label htmlFor="website" className="text-sm font-medium">
          Website <span className="text-muted-foreground">(optional)</span>
        </label>
        <Input
          id="website"
          name="website"
          type="url"
          defaultValue={defaultValues?.website ?? ""}
          placeholder="https://example.com"
          aria-invalid={!!state.fieldErrors.website}
        />
        <FieldError messages={state.fieldErrors.website} />
      </div>

      <div className="grid gap-2">
        <label htmlFor="industry" className="text-sm font-medium">
          Industry <span className="text-muted-foreground">(optional)</span>
        </label>
        <Input
          id="industry"
          name="industry"
          defaultValue={defaultValues?.industry ?? ""}
          placeholder="Fashion, food, technology…"
          aria-invalid={!!state.fieldErrors.industry}
        />
        <FieldError messages={state.fieldErrors.industry} />
      </div>

      <div className="grid gap-2">
        <label htmlFor="description" className="text-sm font-medium">
          About your company <span className="text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={defaultValues?.description ?? ""}
          placeholder="Tell creators what your brand does…"
          aria-invalid={!!state.fieldErrors.description}
        />
        <FieldError messages={state.fieldErrors.description} />
      </div>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? (
          <>
            <Loader2Icon className="animate-spin" />
            Saving…
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {messages[0]}
    </p>
  );
}
