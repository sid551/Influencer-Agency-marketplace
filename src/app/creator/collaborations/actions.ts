"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireCreator } from "@/lib/auth/session";
import { uuidSchema } from "@/lib/validations/ids";
import {
  creatorCollaborationStatusSchema,
  collaborationTermsSchema,
  deliverableSubmissionSchema,
} from "@/lib/validations/collaboration";
import {
  getOrOpenConversation,
} from "@/services/message.service";
import {
  respondToInvitation,
  submitDeliverable,
  transitionCollaborationStatus,
  updateCollaborationTerms,
} from "@/services/collaboration.service";
import type { CollaborationStatus } from "@/types/collaboration.types";

export interface CollaborationActionState {
  ok: boolean;
  message: string | null;
  fieldErrors: Record<string, string[]>;
}

const EMPTY_STATE: CollaborationActionState = {
  ok: false,
  message: null,
  fieldErrors: {},
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

/** Collaboration data appears in the list, the detail page, and the nav
 *  (via conversation state), so invalidate the creator layout as well. */
function revalidateCollaborationViews(collaborationId?: string) {
  revalidatePath("/creator", "layout");
  revalidatePath("/creator/collaborations");
  if (collaborationId) {
    revalidatePath(`/creator/collaborations/${collaborationId}`);
  }
}

/** Accept or decline an invitation. Accepting opens the collaboration and
 *  its message thread through the database trigger. */
export async function respondToInvitationAction(
  requestId: string,
  decision: "accepted" | "declined",
  _prev: CollaborationActionState,
  _formData: FormData,
): Promise<CollaborationActionState> {
  void _prev;
  void _formData;
  const id = uuidSchema.safeParse(requestId);
  const choice = z.enum(["accepted", "declined"]).safeParse(decision);
  if (!id.success || !choice.success) {
    return { ...EMPTY_STATE, message: "Invalid request." };
  }

  const { user } = await requireCreator();
  const result = await respondToInvitation(user.id, id.data, choice.data);

  if (!result.ok) {
    return { ...EMPTY_STATE, message: result.message };
  }

  revalidateCollaborationViews();
  revalidatePath("/creator/messages");
  return {
    ...EMPTY_STATE,
    ok: true,
    message:
      choice.data === "accepted"
        ? "Invitation accepted — your collaboration is ready."
        : "Invitation declined.",
  };
}

/** Creator-side status change. The service mirrors the DB transition
 *  trigger so callers get a readable error instead of a raw Postgres one. */
export async function updateCollaborationStatusAction(
  collaborationId: string,
  nextStatus: CollaborationStatus,
  _prev: CollaborationActionState,
  _formData: FormData,
): Promise<CollaborationActionState> {
  void _prev;
  void _formData;
  const parsed = creatorCollaborationStatusSchema.safeParse(nextStatus);
  const id = uuidSchema.safeParse(collaborationId);
  if (!parsed.success || !id.success) {
    return { ...EMPTY_STATE, message: "Invalid request." };
  }

  const { user } = await requireCreator();
  const result = await transitionCollaborationStatus(
    user.id,
    id.data,
    parsed.data,
  );

  if (!result.ok) {
    return { ...EMPTY_STATE, message: result.message };
  }

  revalidateCollaborationViews(id.data);
  revalidatePath("/creator/messages");
  return {
    ...EMPTY_STATE,
    ok: true,
    message: `Status updated to ${parsed.data.replace(/_/g, " ")}.`,
  };
}

/** Negotiate price, currency, terms and deadline while the agreement is open. */
export async function saveCollaborationTermsAction(
  collaborationId: string,
  _prev: CollaborationActionState,
  formData: FormData,
): Promise<CollaborationActionState> {
  const parsed = collaborationTermsSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  const id = uuidSchema.safeParse(collaborationId);
  if (!parsed.success) {
    return { ...EMPTY_STATE, fieldErrors: fieldErrorsOf(parsed.error) };
  }
  if (!id.success) return { ...EMPTY_STATE, message: "Invalid request." };

  const { user } = await requireCreator();
  const deadline = parsed.data.deadline
    ? new Date(`${parsed.data.deadline}T00:00:00.000Z`).toISOString()
    : null;

  const result = await updateCollaborationTerms(user.id, id.data, {
    terms: parsed.data.terms || null,
    agreedPrice: Number(parsed.data.agreed_price),
    currency: parsed.data.currency.toUpperCase(),
    deadline,
  });

  if (!result.ok) {
    return { ...EMPTY_STATE, message: result.message };
  }

  revalidateCollaborationViews(id.data);
  return {
    ...EMPTY_STATE,
    ok: true,
    message: "Collaboration terms saved.",
  };
}

/** Submit a deliverable (and optionally link the asset) for review. */
export async function submitDeliverableAction(
  collaborationId: string,
  deliverableId: string,
  _prev: CollaborationActionState,
  formData: FormData,
): Promise<CollaborationActionState> {
  const parsed = deliverableSubmissionSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  const id = uuidSchema.safeParse(collaborationId);
  const deliverable = uuidSchema.safeParse(deliverableId);
  if (!parsed.success) {
    return { ...EMPTY_STATE, fieldErrors: fieldErrorsOf(parsed.error) };
  }
  if (!id.success || !deliverable.success) {
    return { ...EMPTY_STATE, message: "Invalid request." };
  }

  const { user } = await requireCreator();
  const result = await submitDeliverable(
    user.id,
    id.data,
    deliverable.data,
    parsed.data.asset_url || null,
  );

  if (!result.ok) {
    return { ...EMPTY_STATE, message: result.message };
  }

  revalidateCollaborationViews(id.data);
  return {
    ...EMPTY_STATE,
    ok: true,
    message: "Deliverable submitted for review.",
  };
}

/** Open (or reuse) the conversation for a collaboration, then navigate to it. */
export async function openConversationAction(
  collaborationId: string,
  _prev: CollaborationActionState,
  _formData: FormData,
): Promise<CollaborationActionState> {
  void _prev;
  void _formData;
  const id = uuidSchema.safeParse(collaborationId);
  if (!id.success) return { ...EMPTY_STATE, message: "Invalid request." };

  const { user } = await requireCreator();
  const result = await getOrOpenConversation(user.id, id.data);

  if (!result.ok) {
    return { ...EMPTY_STATE, message: result.message };
  }

  revalidatePath("/creator/messages");
  redirect(`/creator/messages/${result.data.id}`);
}
