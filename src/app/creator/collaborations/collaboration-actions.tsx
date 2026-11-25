"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2Icon, MessageSquareIcon } from "lucide-react";

import {
  openConversationAction,
  respondToInvitationAction,
  saveCollaborationTermsAction,
  submitDeliverableAction,
  updateCollaborationStatusAction,
} from "./actions";
import type { CollaborationActionState } from "./actions";
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

/** Accept/decline controls for a pending invitation. */
export function InvitationActions({ requestId }: { requestId: string }) {
  const [acceptState, acceptAction, accepting] = useActionState(
    respondToInvitationAction.bind(null, requestId, "accepted"),
    EMPTY_STATE,
  );
  const [declineState, declineAction, declining] = useActionState(
    respondToInvitationAction.bind(null, requestId, "declined"),
    EMPTY_STATE,
  );
  useActionToast(acceptState);
  useActionToast(declineState);

  return (
    <div className="flex shrink-0 gap-2">
      <form action={acceptAction}>
        <Button type="submit" size="sm" disabled={accepting || declining}>
          {accepting ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Accept
        </Button>
      </form>
      <form action={declineAction}>
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={accepting || declining}
        >
          Decline
        </Button>
      </form>
    </div>
  );
}

const STATUS_LABELS: Record<CollaborationStatus, string> = {
  negotiating: "Back to negotiating",
  agreement_pending: "Send for agreement",
  active: "Start collaboration",
  submitted: "Submit work",
  revision_requested: "Resubmit work",
  approved: "Mark complete",
  completed: "Completed",
  cancelled: "Cancel collaboration",
  disputed: "Report a dispute",
};

/** Buttons for the status changes this creator may request. */
export function CollaborationStatusActions({
  collaborationId,
  status,
}: {
  collaborationId: string;
  status: CollaborationStatus;
}) {
  const transitions = CREATOR_COLLABORATION_TRANSITIONS[status];
  if (!transitions?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No further actions are available for this collaboration.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {transitions.map((next) => (
        <StatusButton
          key={next}
          collaborationId={collaborationId}
          next={next}
        />
      ))}
    </div>
  );
}

function StatusButton({
  collaborationId,
  next,
}: {
  collaborationId: string;
  next: CollaborationStatus;
}) {
  const [state, formAction, isPending] = useActionState(
    updateCollaborationStatusAction.bind(null, collaborationId, next),
    EMPTY_STATE,
  );
  useActionToast(state);

  const destructive = next === "cancelled" || next === "disputed";
  return (
    <form action={formAction}>
      <Button
        type="submit"
        size="sm"
        variant={destructive ? "outline" : "default"}
        disabled={isPending}
      >
        {isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
        {STATUS_LABELS[next]}
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
      currency,
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
                    <Input maxLength={3} placeholder="USD" {...field} />
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
