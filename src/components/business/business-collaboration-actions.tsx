"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import {
  approveBusinessDeliverableAction,
  saveBusinessCollaborationTermsAction,
  updateBusinessCollaborationStatusAction,
} from "@/app/business/collaborations/actions";
import type { FormActionState } from "@/types/action-state.types";
import {
  businessCollaborationTermsSchema,
  type BusinessCollaborationTermsValues,
} from "@/lib/validations/business";
import {
  BUSINESS_COLLABORATION_TRANSITIONS,
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const EMPTY_STATE: FormActionState = {
  ok: false,
  message: null,
  fieldErrors: {},
};

function useActionToast(state: FormActionState) {
  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state.message, state.ok]);
}

const STATUS_LABELS: Record<CollaborationStatus, string> = {
  negotiating: "Back to discussing",
  agreement_pending: "Send agreement",
  active: "Start work",
  submitted: "Mark work received",
  revision_requested: "Request changes",
  approved: "Approve work",
  completed: "Finish",
  cancelled: "Cancel collaboration",
  disputed: "Report a problem",
};

/** The next step shown as the primary action for each collaboration state. */
const PRIMARY_NEXT: Partial<Record<CollaborationStatus, CollaborationStatus>> = {
  negotiating: "agreement_pending",
  agreement_pending: "active",
  submitted: "approved",
  approved: "completed",
};

const CONFIRM_MESSAGES: Partial<Record<CollaborationStatus, string>> = {
  completed: "Finish this collaboration? All work should be delivered first.",
  cancelled: "Cancel this collaboration? Both sides will be notified.",
  disputed: "Report a problem? Work will pause until it's resolved.",
};

/** Shows one clear next step; collaboration approval stays hidden until every
 *  submitted deliverable has been approved. */
export function BusinessCollaborationStatusActions({
  collaborationId,
  status,
  canApprove,
}: {
  collaborationId: string;
  status: CollaborationStatus;
  canApprove: boolean;
}) {
  const transitions = BUSINESS_COLLABORATION_TRANSITIONS[status].filter(
    (next) => next !== "approved" || canApprove,
  );
  if (transitions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nothing else is needed here.</p>
    );
  }

  const primary = PRIMARY_NEXT[status];
  const primaryNext = primary && transitions.includes(primary) ? primary : null;
  const secondary = transitions.filter((next) => next !== primaryNext);

  return (
    <div className="grid gap-3">
      {primaryNext ? (
        <StatusButton
          collaborationId={collaborationId}
          next={primaryNext}
          label={STATUS_LABELS[primaryNext]}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Waiting for the creator&apos;s next update.
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
                label={STATUS_LABELS[next]}
                variant={next === "disputed" || next === "cancelled" ? "destructive" : "ghost"}
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
    updateBusinessCollaborationStatusAction.bind(null, collaborationId, next),
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

/** Edit price, currency, deadline and terms while the agreement is open. */
export function BusinessCollaborationTermsForm({
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
    saveBusinessCollaborationTermsAction.bind(null, collaborationId),
    EMPTY_STATE,
  );
  useActionToast(state);
  const [, startTransition] = useTransition();

  const form = useForm<BusinessCollaborationTermsValues>({
    resolver: zodResolver(businessCollaborationTermsSchema),
    defaultValues: {
      terms: terms ?? "",
      agreed_price: agreedPrice !== null ? String(agreedPrice) : "",
      currency,
      deadline: deadline ? deadline.slice(0, 10) : "",
    },
  });

  function onSubmit(values: BusinessCollaborationTermsValues) {
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
                  <FormDescription>
                    Fixed for this collaboration so both sides see the same
                    amount.
                  </FormDescription>
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

/** Approves a single submitted deliverable during review. */
export function ApproveDeliverableButton({
  collaborationId,
  deliverableId,
}: {
  collaborationId: string;
  deliverableId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    approveBusinessDeliverableAction.bind(null, collaborationId, deliverableId),
    EMPTY_STATE,
  );
  useActionToast(state);

  return (
    <form action={formAction}>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
        Approve
      </Button>
    </form>
  );
}
