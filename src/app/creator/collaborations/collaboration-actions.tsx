"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2Icon, MessageSquareIcon } from "lucide-react";

import {
  declineCollaborationAction,
  openConversationAction,
  saveCollaborationTermsAction,
  submitDeliverableAction,
  updateCollaborationStatusAction,
} from "./actions";
import type { CollaborationActionState } from "./actions";
import { DEFAULT_CURRENCY } from "@/lib/money";
import { collaborationTermsSchema } from "@/lib/validations/collaboration";
import type { CollaborationTermsValues } from "@/lib/validations/collaboration";
import {
  CREATOR_COLLABORATION_TRANSITIONS,
  type CollaborationStatus,
} from "@/types/collaboration.types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const EMPTY_STATE: CollaborationActionState = {
  ok: false,
  message: null,
  fieldErrors: {},
};

function useActionToast(state: CollaborationActionState) {
  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state.message, state.ok]);
}

const STATUS_LABELS: Record<CollaborationStatus, string> = {
  negotiating: "Back to discussing",
  agreement_pending: "Confirm terms",
  active: "Start work",
  submitted: "Submit work",
  revision_requested: "Resubmit work",
  approved: "Finish work",
  completed: "Finish work",
  cancelled: "Cancel collaboration",
  disputed: "Report a problem",
};

/** Cancelling is handled by the dedicated decline action, never as a next step. */
type NextAction = Exclude<CollaborationStatus, "cancelled">;

/** The next step shown as the primary action for each collaboration state. */
const PRIMARY_NEXT: Partial<Record<CollaborationStatus, NextAction>> = {
  negotiating: "agreement_pending",
  agreement_pending: "active",
  active: "submitted",
  revision_requested: "submitted",
  approved: "completed",
};

const CONFIRM_MESSAGES: Partial<Record<CollaborationStatus, string>> = {
  negotiating: "Go back to discussing terms? The agreement will need to be sent again.",
  completed: "Finish this collaboration? Make sure all work has been delivered.",
  disputed: "Report a problem? The business will be notified and work will pause.",
};

/** Shows one clear next step; other transitions stay behind "More options". */
export function CollaborationStatusActions({
  collaborationId,
  status,
}: {
  collaborationId: string;
  status: CollaborationStatus;
}) {
  // Declining is handled by a dedicated action that also rejects the
  // application; the raw "cancelled" status button would leave both sides
  // out of sync.
  const transitions = CREATOR_COLLABORATION_TRANSITIONS[status].filter(
    (next) => next !== "cancelled",
  );
  if (!transitions.length) {
    return (
      <p className="text-sm text-muted-foreground">Nothing else is needed here.</p>
    );
  }

  const primary = PRIMARY_NEXT[status];
  const primaryNext = primary && transitions.includes(primary) ? primary : null;
  const secondary = transitions.filter((next) => next !== primaryNext);
  const actionLabel = (next: CollaborationStatus) =>
    next === "submitted" && status === "revision_requested"
      ? "Resubmit work"
      : STATUS_LABELS[next];

  return (
    <div className="grid gap-3">
      {primaryNext ? (
        <StatusButton
          collaborationId={collaborationId}
          next={primaryNext}
          label={actionLabel(primaryNext)}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Waiting for the business to review your work.
        </p>
      )}
      {secondary.length ? (
        <details className="text-xs text-muted-foreground">
          <summary className="w-fit cursor-pointer hover:text-foreground">
            More options
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {secondary.map((next) => (
              <StatusButton
                key={next}
                collaborationId={collaborationId}
                next={next}
                label={actionLabel(next)}
                variant={next === "disputed" ? "destructive" : "ghost"}
              />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function StatusButton({
  collaborationId,
  next,
  label,
  variant = "default",
}: {
  collaborationId: string;
  next: CollaborationStatus;
  label: string;
  variant?: "default" | "ghost" | "destructive";
}) {
  const [state, formAction, isPending] = useActionState(
    updateCollaborationStatusAction.bind(null, collaborationId, next),
    EMPTY_STATE,
  );
  useActionToast(state);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        const message = CONFIRM_MESSAGES[next];
        if (message && !window.confirm(message)) event.preventDefault();
      }}
    >
      <Button type="submit" size="sm" variant={variant} disabled={isPending}>
        {isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
        {label}
      </Button>
    </form>
  );
}

/** Decline the work and close the application. */
export function CreatorDeclineButton({
  collaborationId,
}: {
  collaborationId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    declineCollaborationAction.bind(null, collaborationId),
    EMPTY_STATE,
  );
  useActionToast(state);

  return (
    <form action={formAction}>
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
        Decline work
      </Button>
    </form>
  );
}

/** Edit terms while the agreement is still open. */
export function CollaborationTermsForm({
  collaborationId,
  terms,
  agreedPrice,
  currency,
  deadline,
}: {
  collaborationId: string;
  terms: string | null;
  agreedPrice: number | null;
  currency: string;
  deadline: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    saveCollaborationTermsAction.bind(null, collaborationId),
    EMPTY_STATE,
  );
  useActionToast(state);
  const [, startTransition] = useTransition();

  const form = useForm<CollaborationTermsValues>({
    resolver: zodResolver(collaborationTermsSchema),
    defaultValues: {
      terms: terms ?? "",
      agreed_price: agreedPrice !== null ? String(agreedPrice) : "",
      currency: currency === DEFAULT_CURRENCY ? currency : DEFAULT_CURRENCY,
      deadline: deadline ? deadline.slice(0, 10) : "",
    },
  });

  function onSubmit(values: CollaborationTermsValues) {
    const formData = new FormData();
    formData.append("terms", values.terms ?? "");
    formData.append("agreed_price", values.agreed_price);
    formData.append("currency", values.currency);
    formData.append("deadline", values.deadline ?? "");
    startTransition(async () => {
      await formAction(formData);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Negotiate terms</CardTitle>
        <CardDescription>
          These details can be edited until the agreement is active.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 sm:grid-cols-2"
            noValidate
          >
            <FormField
              control={form.control}
              name="agreed_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agreed price</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" placeholder="500.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <Input placeholder="INR" {...field} readOnly />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deadline</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="sm:col-span-2">
              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terms</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Deliverables, revisions, payment terms…"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
                Save terms
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

/** Attach/link an asset and mark a deliverable as submitted. */
export function DeliverableSubmitForm({
  collaborationId,
  deliverableId,
}: {
  collaborationId: string;
  deliverableId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    submitDeliverableAction.bind(null, collaborationId, deliverableId),
    EMPTY_STATE,
  );
  useActionToast(state);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <Input
        name="asset_url"
        placeholder="Asset link (optional)"
        aria-label="Asset link"
        className="h-8 text-xs"
      />
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
        Submit
      </Button>
    </form>
  );
}

/** Opens (or reuses) the conversation for this collaboration. */
export function OpenConversationButton({
  collaborationId,
}: {
  collaborationId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    openConversationAction.bind(null, collaborationId),
    EMPTY_STATE,
  );
  useActionToast(state);

  return (
    <form action={formAction}>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <MessageSquareIcon className="size-4" />
        )}
        Message business
      </Button>
    </form>
  );
}
