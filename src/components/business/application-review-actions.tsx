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
  accepted: "Start negotiating",
  finalized: "Select this creator",
  rejected: "Decline",
};

const CONFIRM_MESSAGES: Partial<Record<BusinessApplicationDecision, string>> = {
  finalized:
    "Select this creator? The other accepted creators will be declined automatically.",
  rejected: "Decline this application? The creator will be notified.",
};

/** Only shows decisions allowed by the current application status. */
export function ApplicationReviewActions({
  applicationId,
  status,
}: {
  applicationId: string;
  status: ApplicationStatus;
}) {
  const decisions = BUSINESS_APPLICATION_TRANSITIONS[status];

  if (decisions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This application is closed — no further action is needed.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {decisions.map((decision) => (
          <ApplicationDecisionButton
            key={decision}
            applicationId={applicationId}
            decision={decision}
          />
        ))}
      </div>
      {decisions.includes("finalized") ? (
        <p className="text-xs text-muted-foreground">
          Selecting a creator automatically declines other accepted creators.
          Message them first if you still need to agree on terms.
        </p>
      ) : null}
    </div>
  );
}

export function ApplicationDecisionButton({
  applicationId,
  decision,
  size = "sm",
}: {
  applicationId: string;
  decision: BusinessApplicationDecision;
  size?: "sm" | "default";
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
        variant={
          decision === "accepted" || decision === "finalized"
            ? "default"
            : "outline"
        }
        disabled={pending}
      >
        {pending ? <Loader2Icon className="animate-spin" /> : null}
        {DECISION_LABELS[decision]}
      </Button>
    </form>
  );
}
