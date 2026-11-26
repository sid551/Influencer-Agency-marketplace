"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquareIcon } from "lucide-react";

import { openBusinessConversationAction } from "@/app/business/collaborations/actions";
import { Button } from "@/components/ui/button";

/** Creates the collaboration's single conversation on first use, then
 *  navigates to the business thread. */
export function OpenConversationButton({
  collaborationId,
}: {
  collaborationId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleOpen() {
    startTransition(async () => {
      const result = await openBusinessConversationAction(collaborationId);
      if (!result.ok || !result.conversationId) {
        toast.error(result.message ?? "Could not open the conversation.");
        return;
      }
      router.push(`/business/messages/${result.conversationId}`);
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="mt-2"
      onClick={handleOpen}
      disabled={pending}
    >
      <MessageSquareIcon className="size-3.5" />
      {pending ? "Opening…" : "Message creator"}
    </Button>
  );
}
