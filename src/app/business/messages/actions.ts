"use server";

import { revalidatePath } from "next/cache";

import { requireBusiness } from "@/lib/auth/session";
import { messageSchema } from "@/lib/validations/collaboration";
import { uuidSchema } from "@/lib/validations/ids";
import {
  markConversationRead,
  sendMessage,
} from "@/services/message.service";
import type { Message } from "@/types/collaboration.types";

export interface MessageActionState {
  ok: boolean;
  message: string | null;
  fieldErrors: Record<string, string[]>;
  sent: Message | null;
}

const EMPTY_STATE: MessageActionState = {
  ok: false,
  message: null,
  fieldErrors: {},
  sent: null,
};

function fieldErrorsOf(
  error: { issues: Array<{ path: unknown[]; message: string }> },
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues ?? []) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/** Send a message as the signed-in business. RLS enforces participation. */
export async function sendMessageAction(
  conversationId: string,
  _prev: MessageActionState,
  formData: FormData,
): Promise<MessageActionState> {
  const parsed = messageSchema.safeParse({ body: formData.get("body") });
  const id = uuidSchema.safeParse(conversationId);
  if (!parsed.success) {
    return { ...EMPTY_STATE, fieldErrors: fieldErrorsOf(parsed.error) };
  }
  if (!id.success) return { ...EMPTY_STATE, message: "Invalid request." };

  const { user } = await requireBusiness();
  const result = await sendMessage({
    conversationId: id.data,
    senderProfileId: user.id,
    body: parsed.data.body,
  });

  if (!result.ok) {
    return { ...EMPTY_STATE, message: result.message };
  }

  revalidatePath("/business", "layout");
  revalidatePath("/business/messages");
  revalidatePath(`/business/messages/${id.data}`);

  return { ...EMPTY_STATE, ok: true, sent: result.data };
}

/** Clear the unread badge when a thread is opened or new mail arrives. */
export async function markConversationReadAction(
  conversationId: string,
): Promise<void> {
  const id = uuidSchema.safeParse(conversationId);
  if (!id.success) return;

  const { user } = await requireBusiness();
  const result = await markConversationRead(user.id, id.data);
  if (!result.ok || result.data === 0) return;

  revalidatePath("/business", "layout");
  revalidatePath("/business/messages");
}
