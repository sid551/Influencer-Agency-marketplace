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
  removeCampaignImage,
  uploadCampaignImage,
  type CampaignImageAsset,
} from "@/services/campaign-image.service";
import {
  createBusinessCampaign,
  getBusinessCampaign,
  updateBusinessCampaign,
  type CampaignImageFields,
} from "@/services/business-campaign.service";
import {
  EMPTY_FORM_STATE,
  type FormActionState,
} from "@/types/action-state.types";

function value(formData: FormData, name: string): string {
  const raw = formData.get(name);
  return typeof raw === "string" ? raw : "";
}

function selectedImage(formData: FormData): File | null {
  const raw = formData.get("campaign_image");
  return raw instanceof File && raw.size > 0 ? raw : null;
}

function rawCampaign(formData: FormData) {
  return {
    title: value(formData, "title"),
    description: value(formData, "description"),
    category: value(formData, "category"),
    platforms: formData.getAll("platforms"),
    target_niches: formData.getAll("target_niches"),
    collaboration_type: value(formData, "collaboration_type"),
    budget_min: value(formData, "budget_min"),
    budget_max: value(formData, "budget_max"),
    currency: value(formData, "currency"),
    deliverables: value(formData, "deliverables"),
    application_deadline: value(formData, "application_deadline"),
    location: value(formData, "location"),
    image_alt: value(formData, "image_alt"),
    status: value(formData, "status"),
  };
}

function revalidateCampaignViews() {
  revalidatePath("/business");
  revalidatePath("/business/campaigns");
}

function imageUploadError(message: string): FormActionState {
  return { ...EMPTY_FORM_STATE, fieldErrors: { campaign_image: [message] } };
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
  const file = selectedImage(formData);
  let uploaded: CampaignImageAsset | null = null;

  if (file) {
    const result = await uploadCampaignImage(user.id, file);
    if (!result.ok) return imageUploadError(result.message);
    uploaded = result.data;
  }

  const image: CampaignImageFields = {
    image_url: uploaded?.image_url ?? null,
    image_public_id: uploaded?.image_public_id ?? null,
    image_alt: uploaded ? parsed.data.image_alt : null,
  };

  const result = await createBusinessCampaign(user.id, parsed.data, image);
  if (!result.ok) {
    // The campaign was not saved, so do not leave an orphaned Cloudinary asset.
    await removeCampaignImage(uploaded?.image_public_id);
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
  // Read the current reference server-side rather than trusting a hidden field.
  const existing = await getBusinessCampaign(user.id, id.data);
  if (!existing) {
    return { ...EMPTY_FORM_STATE, message: "Campaign not found." };
  }

  const file = selectedImage(formData);
  const removeRequested = !file && value(formData, "remove_image") === "true";
  let uploaded: CampaignImageAsset | null = null;

  if (file) {
    const uploadResult = await uploadCampaignImage(user.id, file);
    if (!uploadResult.ok) return imageUploadError(uploadResult.message);
    uploaded = uploadResult.data;
  }

  const hasExistingImage = existing.image_url !== null;
  const image: CampaignImageFields = uploaded
    ? { ...uploaded, image_alt: parsed.data.image_alt }
    : removeRequested || !hasExistingImage
      ? { image_url: null, image_public_id: null, image_alt: null }
      : {
          image_url: existing.image_url,
          image_public_id: existing.image_public_id,
          image_alt: parsed.data.image_alt,
        };

  const result = await updateBusinessCampaign(
    user.id,
    id.data,
    parsed.data,
    image,
  );
  if (!result.ok) {
    await removeCampaignImage(uploaded?.image_public_id);
    return { ...EMPTY_FORM_STATE, message: result.message };
  }

  if (uploaded || removeRequested) {
    await removeCampaignImage(existing.image_public_id);
  }

  revalidateCampaignViews();
  revalidatePath(`/business/campaigns/${id.data}`);
  redirect("/business/campaigns");
}
