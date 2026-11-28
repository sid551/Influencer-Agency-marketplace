"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { CheckCircle2Icon, Loader2Icon } from "lucide-react";

import { completeCampaignAction } from "@/app/business/campaigns/actions";
import { Button } from "@/components/ui/button";
import { EMPTY_FORM_STATE } from "@/types/action-state.types";

/** Ends the campaign while keeping it visible to creators who applied. */
export function CompleteCampaignButton({
  campaignId,
  finished,
}: {
  campaignId: string;
  finished: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    completeCampaignAction.bind(null, campaignId),
    EMPTY_FORM_STATE,
  );

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state.message, state.ok]);

  if (finished) return null;

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Mark this campaign as finished? Creators who applied will see that it ended.",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2Icon className="animate-spin" /> : <CheckCircle2Icon className="size-4" />}
        Complete campaign
      </Button>
    </form>
  );
}
