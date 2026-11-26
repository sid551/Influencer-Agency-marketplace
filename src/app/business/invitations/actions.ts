"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireBusiness } from "@/lib/auth/session";
import { fieldErrorsOf } from "@/lib/validations/form-errors";
import {
  collaborationInvitationSchema,
} from "@/lib/validations/business";
import { uuidSchema } from "@/lib/validations/ids";
import { getBusinessCampaign } from "@/services/business-campaign.service";
import {
  cancelBusinessInvitation,
  createBusinessInvitation,
} from "@/services/business-invitation.service";
import {
  EMPTY_FORM_STATE,
  type FormActionState,
} from "@/types/action-state.types";

function value(formData: FormData, name: string): string {
  const raw = formData.get(name);
  return typeof raw === "string" ? raw : "";
}

function revalidateInvitationViews() {
  revalidatePath("/business");
  revalidatePath("/business/invitations");
}

/** Invite a creator, optionally attaching one of the business's campaigns. */
export async function sendInvitationAction(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  void _prev;
  const creator = uuidSchema.safeParse(formData.get("creator_profile_id"));
  const rawCampaignId = value(formData, "campaign_id");
  const campaign =
    rawCampaignId === ""
      ? { success: true as const, data: null }
      : uuidSchema.safeParse(rawCampaignId);
  const parsed = collaborationInvitationSchema.safeParse({
    message: value(formData, "message"),
  });

  const fieldErrors = {
    ...(creator.success ? {} : { creator_profile_id: ["Choose a creator."] }),
    ...(campaign.success ? {} : { campaign_id: ["Invalid campaign."] }),
    ...(!parsed.success ? fieldErrorsOf(parsed.error) : {}),
  };
  if (!creator.success || !campaign.success || !parsed.success) {
    return { ...EMPTY_FORM_STATE, fieldErrors };
  }

  const { user } = await requireBusiness();
  if (campaign.data) {
    const owned = await getBusinessCampaign(user.id, campaign.data);
    if (!owned) {
      return {
        ...EMPTY_FORM_STATE,
        fieldErrors: { campaign_id: ["Choose one of your own campaigns."] },
      };
    }
  }

  const result = await createBusinessInvitation(user.id, {
    creatorProfileId: creator.data,
    campaignId: campaign.data,
    message: parsed.data.message,
  });
  if (!result.ok) {
    return { ...EMPTY_FORM_STATE, message: result.message };
  }

  revalidateInvitationViews();
  redirect("/business/invitations");
}

/** Cancel a pending invitation; sent invitations cannot be deleted. */
export async function cancelInvitationAction(
  requestId: string,
  _prev: FormActionState,
  _formData: FormData,
): Promise<FormActionState> {
  void _prev;
  void _formData;
  const id = uuidSchema.safeParse(requestId);
  if (!id.success) {
    return { ...EMPTY_FORM_STATE, message: "Invalid invitation." };
  }

  const { user } = await requireBusiness();
  const result = await cancelBusinessInvitation(user.id, id.data);
  if (!result.ok) {
    return { ...EMPTY_FORM_STATE, message: result.message };
  }

  revalidateInvitationViews();
  return {
    ok: true,
    message: "Invitation cancelled.",
    fieldErrors: {},
  };
}
