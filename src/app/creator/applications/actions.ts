"use server";

import { redirect } from "next/navigation";

import { requireCreator } from "@/lib/auth/session";
import {
  getOwnCreatorProfile,
  updateOwnCreatorProfile,
} from "@/services/creator-profile.service";
import {
  createApplication,
  hasAppliedToCampaign,
} from "@/services/campaign.service";
import {
  campaignApplicationSchema,
} from "@/lib/validations/campaign";
import { uuidSchema } from "@/lib/validations/ids";

export interface CampaignApplicationActionState {
  ok: boolean;
  message: string | null;
  fieldErrors: Record<string, string[]>;
}

const EMPTY_STATE: CampaignApplicationActionState = {
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

/** Apply to a campaign. Re-verifies session, validates payload, checks
 *  onboarding is complete, prevents duplicate applications, then writes
 *  through RLS-scoped services. */
export async function applyToCampaign(
  campaignId: string,
  _prev: CampaignApplicationActionState,
  formData: FormData,
): Promise<CampaignApplicationActionState> {
  const id = uuidSchema.safeParse(campaignId);
  if (!id.success) {
    return { ...EMPTY_STATE, message: "Invalid campaign." };
  }

  const raw = Object.fromEntries(formData.entries());

  const parsed = campaignApplicationSchema.safeParse(raw);
  if (!parsed.success) {
    return { ...EMPTY_STATE, fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const { user } = await requireCreator();

  const creatorProfile = await getOwnCreatorProfile(user.id);
  if (!creatorProfile?.onboarding_completed) {
    return {
      ...EMPTY_STATE,
      message: "Complete your onboarding before applying to campaigns.",
    };
  }

  const alreadyApplied = await hasAppliedToCampaign(user.id, id.data);
  if (alreadyApplied) {
    return {
      ...EMPTY_STATE,
      message: "You have already applied to this campaign.",
    };
  }

  const result = await createApplication({
    campaignId: id.data,
    creatorProfileId: user.id,
    proposal: parsed.data.proposal,
    whySuitable: parsed.data.why_suitable || null,
    expectedPrice: parsed.data.expected_price,
    currency: parsed.data.currency,
  });

  if (!result.ok) {
    return { ...EMPTY_STATE, message: result.message };
  }

  // Advance onboarding step if the creator hasn't reached step 10+ yet.
  if (creatorProfile.onboarding_step < 10) {
    await updateOwnCreatorProfile(user.id, {
      onboarding_step: 10,
    });
  }

  redirect(`/creator/applications`);
}
