"use server";

import { revalidatePath } from "next/cache";

import { requireBusiness } from "@/lib/auth/session";
import {
  businessCollaborationStatusSchema,
  businessCollaborationTermsSchema,
  businessDeliverablesSchema,
} from "@/lib/validations/business";
import { fieldErrorsOf } from "@/lib/validations/form-errors";
import { uuidSchema } from "@/lib/validations/ids";
import {
  approveBusinessDeliverable,
  saveBusinessDeliverables,
  transitionBusinessCollaborationStatus,
  updateBusinessCollaborationTerms,
} from "@/services/business-collaboration.service";
import { getOrOpenBusinessConversation } from "@/services/message.service";
import {
  EMPTY_FORM_STATE,
  type FormActionState,
} from "@/types/action-state.types";

function value(formData: FormData, name: string): string {
  const raw = formData.get(name);
  return typeof raw === "string" ? raw : "";
}

function revalidateCollaborationViews(collaborationId?: string) {
  revalidatePath("/business");
  revalidatePath("/business/collaborations");
  if (collaborationId) {
    revalidatePath(`/business/collaborations/${collaborationId}`);
  }
}

/** Business-side status change. The service mirrors the DB transition trigger
 *  so invalid requests get a readable message instead of a Postgres error. */
export async function updateBusinessCollaborationStatusAction(
  collaborationId: string,
  nextStatus: string,
  _prev: FormActionState,
  _formData: FormData,
): Promise<FormActionState> {
  void _prev;
  void _formData;
  const id = uuidSchema.safeParse(collaborationId);
  const status = businessCollaborationStatusSchema.safeParse(nextStatus);
  if (!id.success || !status.success) {
    return { ...EMPTY_FORM_STATE, message: "Invalid request." };
  }

  const { user } = await requireBusiness();
  const result = await transitionBusinessCollaborationStatus(
    user.id,
    id.data,
    status.data,
  );
  if (!result.ok) {
    return { ...EMPTY_FORM_STATE, message: result.message };
  }

  revalidateCollaborationViews(id.data);
  return {
    ...EMPTY_FORM_STATE,
    ok: true,
    message: `Status updated to ${status.data.replace(/_/g, " ")}.`,
  };
}

/** Negotiate price, currency, terms and deadline while the agreement is open. */
export async function saveBusinessCollaborationTermsAction(
  collaborationId: string,
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = businessCollaborationTermsSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  const id = uuidSchema.safeParse(collaborationId);
  if (!parsed.success) {
    return { ...EMPTY_FORM_STATE, fieldErrors: fieldErrorsOf(parsed.error) };
  }
  if (!id.success) {
    return { ...EMPTY_FORM_STATE, message: "Invalid request." };
  }

  const { user } = await requireBusiness();
  const deadline = parsed.data.deadline
    ? new Date(`${parsed.data.deadline}T00:00:00.000Z`).toISOString()
    : null;

  const result = await updateBusinessCollaborationTerms(user.id, id.data, {
    terms: parsed.data.terms || null,
    agreedPrice: Number(parsed.data.agreed_price),
    currency: parsed.data.currency.toUpperCase(),
    deadline,
  });
  if (!result.ok) {
    return { ...EMPTY_FORM_STATE, message: result.message };
  }

  revalidateCollaborationViews(id.data);
  return {
    ...EMPTY_FORM_STATE,
    ok: true,
    message: "Collaboration terms saved.",
  };
}

/** Save the agreed deliverable list during negotiation. */
export async function saveBusinessDeliverablesAction(
  collaborationId: string,
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = businessDeliverablesSchema.safeParse({
    deliverables: value(formData, "deliverables"),
  });
  const id = uuidSchema.safeParse(collaborationId);
  if (!parsed.success) {
    return { ...EMPTY_FORM_STATE, fieldErrors: fieldErrorsOf(parsed.error) };
  }
  if (!id.success) {
    return { ...EMPTY_FORM_STATE, message: "Invalid request." };
  }

  const { user } = await requireBusiness();
  const result = await saveBusinessDeliverables(
    user.id,
    id.data,
    parsed.data.deliverables,
  );
  if (!result.ok) {
    return { ...EMPTY_FORM_STATE, message: result.message };
  }

  revalidateCollaborationViews(id.data);
  return {
    ...EMPTY_FORM_STATE,
    ok: true,
    message: "Deliverables saved.",
  };
}

/** Approve one deliverable submitted by the creator. */
export async function approveBusinessDeliverableAction(
  collaborationId: string,
  deliverableId: string,
  _prev: FormActionState,
  _formData: FormData,
): Promise<FormActionState> {
  void _prev;
  void _formData;
  const id = uuidSchema.safeParse(collaborationId);
  const deliverable = uuidSchema.safeParse(deliverableId);
  if (!id.success || !deliverable.success) {
    return { ...EMPTY_FORM_STATE, message: "Invalid request." };
  }

  const { user } = await requireBusiness();
  const result = await approveBusinessDeliverable(
    user.id,
    id.data,
    deliverable.data,
  );
  if (!result.ok) {
    return { ...EMPTY_FORM_STATE, message: result.message };
  }

  revalidateCollaborationViews(id.data);
  return {
    ...EMPTY_FORM_STATE,
    ok: true,
    message: "Deliverable approved.",
  };
}

/** Open (or reuse) the single thread attached to a business collaboration. */
export async function openBusinessConversationAction(
  collaborationId: string,
): Promise<{ ok: boolean; message: string | null; conversationId: string | null }> {
  const id = uuidSchema.safeParse(collaborationId);
  if (!id.success) {
    return { ok: false, message: "Invalid request.", conversationId: null };
  }

  const { user } = await requireBusiness();
  const result = await getOrOpenBusinessConversation(user.id, id.data);
  if (!result.ok) {
    return { ok: false, message: result.message, conversationId: null };
  }

  revalidateCollaborationViews(id.data);
  revalidatePath("/business/messages");
  return { ok: true, message: null, conversationId: result.data.id };
}
