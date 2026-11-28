"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import {
  reviewApplicationAction,
  selectBidAction,
} from "@/app/business/applications/actions";
import { Button } from "@/components/ui/button";
import {
  BUSINESS_APPLICATION_TRANSITIONS,
  type ApplicationStatus,
  type BusinessApplicationDecision,
} from "@/types/campaign.types";
import { EMPTY_FORM_STATE } from "@/types/action-state.types";

const DECISION_LABELS: Record<BusinessApplicationDecision, string> = {
  accepted: "Message creator",
  finalized: "Select at agreed rate",
  rejected: "Decline",
};

const CONFIRM_MESSAGES: Partial<Record<BusinessApplicationDecision, string>> = {
  finalized: "Select this creator? Other creators stay available for selection.",
  rejected: "Decline this application? The creator will be notified.",
};

/** One primary bid decision: accept the creator's rate or decline quietly. */
export function ApplicationReviewActions({
  applicationId,
  status,
}: {
  applicationId: string;
  status: ApplicationStatus;
}) {
  const decisions = BUSINESS_APPLICATION_TRANSITIONS[status];
  const canSelect = status === "pending" || status === "accepted";
  const canDecline = decisions.includes("rejected");

  if (!canSelect && !canDecline) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing else is needed for this application.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {canSelect ? (
          <SelectBidButton applicationId={applicationId} size="default" />
        ) : null}
        {canDecline ? (
          <ApplicationDecisionButton
            applicationId={applicationId}
            decision="rejected"
            variant="ghost"
          />
        ) : null}
      </div>
      {canSelect ? (
        <p className="text-xs text-muted-foreground">
          The creator&apos;s quoted rate is used automatically. Other creators
          stay available for this campaign.
        </p>
      ) : null}
    </div>
  );
}

/** Selects a creator at the rate in their application. */
export function SelectBidButton({
  applicationId,
  size = "sm",
  variant = "default",
}: {
  applicationId: string;
  size?: "sm" | "default";
  variant?: "default" | "ghost";
}) {
  const [state, formAction, pending] = useActionState(
    selectBidAction.bind(null, applicationId),
    EMPTY_FORM_STATE,
  );

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state.message, state.ok]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Select this creator at their quoted rate? Other creators stay available.",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <Button type="submit" size={size} variant={variant} disabled={pending}>
        {pending ? <Loader2Icon className="animate-spin" /> : null}
        Select creator
      </Button>
    </form>
  );
}

export function ApplicationDecisionButton({
  applicationId,
  decision,
  size = "sm",
  variant,
}: {
  applicationId: string;
  decision: BusinessApplicationDecision;
  size?: "sm" | "default";
  variant?: "default" | "ghost";
}) {
  const [state, formAction, pending] = useActionState(
    reviewApplicationAction.bind(null, applicationId, decision),
    EMPTY_FORM_STATE,
  );

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state.message, state.ok]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        const message = CONFIRM_MESSAGES[decision];
        if (message && !window.confirm(message)) event.preventDefault();
      }}
    >
      <Button
        type="submit"
        size={size}
        variant={variant ?? (decision === "rejected" ? "ghost" : "default")}
        disabled={pending}
      >
        {pending ? <Loader2Icon className="animate-spin" /> : null}
        {DECISION_LABELS[decision]}
      </Button>
    </form>
  );
}
