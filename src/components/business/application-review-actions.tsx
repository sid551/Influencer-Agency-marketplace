"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { reviewApplicationAction } from "@/app/business/applications/actions";
import { Button } from "@/components/ui/button";
import {
  BUSINESS_APPLICATION_TRANSITIONS,
  type ApplicationStatus,
  type BusinessApplicationDecision,
} from "@/types/campaign.types";
import { EMPTY_FORM_STATE } from "@/types/action-state.types";

const DECISION_LABELS: Record<BusinessApplicationDecision, string> = {
  accepted: "Message creator",
  finalized: "Select creator",
  rejected: "Decline",
};

const CONFIRM_MESSAGES: Partial<Record<BusinessApplicationDecision, string>> = {
  finalized:
    "Select this creator? The other accepted creators will be declined automatically.",
  rejected: "Decline this application? The creator will be notified.",
};

/** The one decision a business should focus on for each application. */
const PRIMARY_DECISION: Partial<
  Record<ApplicationStatus, BusinessApplicationDecision>
> = {
  pending: "accepted",
  accepted: "finalized",
};

/** Shows one primary next step, with decline kept as a quiet secondary action. */
export function ApplicationReviewActions({
  applicationId,
  status,
}: {
  applicationId: string;
  status: ApplicationStatus;
}) {
  const decisions = BUSINESS_APPLICATION_TRANSITIONS[status];
  const primary = PRIMARY_DECISION[status];
  const secondary = decisions.find((decision) => decision === "rejected");

  if (!primary && !secondary) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing else is needed for this application.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {primary ? (
          <ApplicationDecisionButton
            applicationId={applicationId}
            decision={primary}
            size="default"
          />
        ) : null}
        {secondary ? (
          <ApplicationDecisionButton
            applicationId={applicationId}
            decision={secondary}
            variant="ghost"
          />
        ) : null}
      </div>
      {primary === "finalized" ? (
        <p className="text-xs text-muted-foreground">
          This closes the other conversations for the campaign. Message the
          creator first if terms are not agreed yet.
        </p>
      ) : null}
    </div>
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
