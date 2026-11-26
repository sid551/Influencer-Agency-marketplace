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
  shortlisted: "Shortlist",
  accepted: "Accept",
  rejected: "Decline",
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
  if (decisions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {decisions.map((decision) => (
        <DecisionButton
          key={decision}
          applicationId={applicationId}
          decision={decision}
        />
      ))}
    </div>
  );
}

function DecisionButton({
  applicationId,
  decision,
}: {
  applicationId: string;
  decision: BusinessApplicationDecision;
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
    <form action={formAction}>
      <Button
        type="submit"
        size="sm"
        variant={decision === "accepted" ? "default" : "outline"}
        disabled={pending}
      >
        {pending ? <Loader2Icon className="animate-spin" /> : null}
        {DECISION_LABELS[decision]}
      </Button>
    </form>
  );
}
