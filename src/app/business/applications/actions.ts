"use server";

import { revalidatePath } from "next/cache";

import { requireBusiness } from "@/lib/auth/session";
import { applicationDecisionSchema } from "@/lib/validations/business";
import { uuidSchema } from "@/lib/validations/ids";
import {
  reviewBusinessApplication,
  selectBusinessApplicationBid,
} from "@/services/business-application.service";
import type { BusinessApplicationDecision } from "@/types/campaign.types";
import {
  EMPTY_FORM_STATE,
  type FormActionState,
} from "@/types/action-state.types";

const DECISION_LABELS: Record<BusinessApplicationDecision, string> = {
  accepted: "Application accepted. You can now negotiate and chat.",
  finalized: "Creator selected at the agreed rate.",
  rejected: "Application declined.",
};

/** Review an application to one of the business's own campaigns. */
export async function reviewApplicationAction(
  applicationId: string,
  decision: BusinessApplicationDecision,
  _prev: FormActionState,
  _formData: FormData,
): Promise<FormActionState> {
  void _prev;
  void _formData;
  const id = uuidSchema.safeParse(applicationId);
  const parsedDecision = applicationDecisionSchema.safeParse(decision);
  if (!id.success || !parsedDecision.success) {
    return { ...EMPTY_FORM_STATE, message: "Invalid request." };
  }

  const { user } = await requireBusiness();
  const result = await reviewBusinessApplication(
    user.id,
    id.data,
    parsedDecision.data,
  );
  if (!result.ok) {
    return { ...EMPTY_FORM_STATE, message: result.message };
  }

  revalidatePath("/business", "layout");
  revalidatePath("/business/campaigns", "layout");
  revalidatePath("/business/messages");
  revalidatePath("/business/messages/campaigns", "layout");
  revalidatePath("/business/collaborations");
  return {
    ok: true,
    message: DECISION_LABELS[parsedDecision.data],
    fieldErrors: {},
  };
}

/** Select a creator bid at the creator's quoted rate. */
export async function selectBidAction(
  applicationId: string,
  _prev: FormActionState,
  _formData: FormData,
): Promise<FormActionState> {
  void _prev;
  void _formData;
  const id = uuidSchema.safeParse(applicationId);
  if (!id.success) {
    return { ...EMPTY_FORM_STATE, message: "Invalid request." };
  }

  const { user } = await requireBusiness();
  const result = await selectBusinessApplicationBid(user.id, id.data);
  if (!result.ok) {
    return { ...EMPTY_FORM_STATE, message: result.message };
  }

  revalidatePath("/business", "layout");
  revalidatePath("/business/campaigns", "layout");
  revalidatePath("/business/applications", "layout");
  revalidatePath("/business/messages");
  revalidatePath("/business/collaborations");
  revalidatePath("/creator/applications");
  revalidatePath("/creator/campaigns", "layout");
  return {
    ok: true,
    message: "Creator selected at their quoted rate.",
    fieldErrors: {},
  };
}
