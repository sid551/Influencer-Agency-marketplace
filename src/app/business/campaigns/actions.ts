"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireBusiness } from "@/lib/auth/session";
import { fieldErrorsOf } from "@/lib/validations/form-errors";
import { uuidSchema } from "@/lib/validations/ids";
import {
  campaignCreateSchema,
  campaignUpdateSchema,
} from "@/lib/validations/business";
import {
  createBusinessCampaign,
  updateBusinessCampaign,
} from "@/services/business-campaign.service";
import {
  EMPTY_FORM_STATE,
  type FormActionState,
} from "@/types/action-state.types";

function value(formData: FormData, name: string): string {
  const raw = formData.get(name);
  return typeof raw === "string" ? raw : "";
}

function rawCampaign(formData: FormData) {
  return {
    title: value(formData, "title"),
    description: value(formData, "description"),
    category: value(formData, "category"),
    platforms: formData.getAll("platforms"),
    collaboration_type: value(formData, "collaboration_type"),
    budget_min: value(formData, "budget_min"),
    budget_max: value(formData, "budget_max"),
    currency: value(formData, "currency"),
    deliverables: value(formData, "deliverables"),
    application_deadline: value(formData, "application_deadline"),
    location: value(formData, "location"),
    status: value(formData, "status"),
  };
}

function revalidateCampaignViews() {
  revalidatePath("/business");
  revalidatePath("/business/campaigns");
}

/** Create a draft or published campaign for the signed-in business. */
export async function createBusinessCampaignAction(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = campaignCreateSchema.safeParse(rawCampaign(formData));
  if (!parsed.success) {
    return {
      ...EMPTY_FORM_STATE,
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const { user } = await requireBusiness();
  const result = await createBusinessCampaign(user.id, parsed.data);
  if (!result.ok) {
    return { ...EMPTY_FORM_STATE, message: result.message };
  }

  revalidateCampaignViews();
  redirect("/business/campaigns");
}

/** Edit an owned campaign; the id is validated before reaching a service. */
export async function updateBusinessCampaignAction(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const id = uuidSchema.safeParse(formData.get("campaignId"));
  if (!id.success) {
    return { ...EMPTY_FORM_STATE, message: "Invalid campaign." };
  }

  const parsed = campaignUpdateSchema.safeParse(rawCampaign(formData));
  if (!parsed.success) {
    return {
      ...EMPTY_FORM_STATE,
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const { user } = await requireBusiness();
  const result = await updateBusinessCampaign(user.id, id.data, parsed.data);
  if (!result.ok) {
    return { ...EMPTY_FORM_STATE, message: result.message };
  }

  revalidateCampaignViews();
  revalidatePath(`/business/campaigns/${id.data}`);
  redirect("/business/campaigns");
}
