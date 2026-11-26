"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { cancelInvitationAction } from "@/app/business/invitations/actions";
import { Button } from "@/components/ui/button";
import {
  EMPTY_FORM_STATE,
  type FormActionState,
} from "@/types/action-state.types";

export function CancelInvitationButton({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState(
    cancelInvitationAction.bind(null, requestId),
    EMPTY_FORM_STATE as FormActionState,
  );

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state.message, state.ok]);

  return (
    <form action={formAction}>
      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        {pending ? <Loader2Icon className="animate-spin" /> : null}
        Cancel
      </Button>
    </form>
  );
}
