"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireBusiness } from "@/lib/auth/session";
import { fieldErrorsOf } from "@/lib/validations/form-errors";
import { businessProfileSchema } from "@/lib/validations/business";
import {
  completeBusinessOnboarding,
  createOwnBusinessProfile,
  getOwnBusinessProfile,
  updateOwnBusinessProfile,
} from "@/services/business-profile.service";
import {
  EMPTY_FORM_STATE,
  type FormActionState,
} from "@/types/action-state.types";

function value(formData: FormData, name: string): string {
  const raw = formData.get(name);
  return typeof raw === "string" ? raw : "";
}

/** Create or update the company profile and finish business onboarding. */
export async function saveBusinessOnboarding(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = businessProfileSchema.safeParse({
    company_name: value(formData, "company_name"),
    website: value(formData, "website"),
    description: value(formData, "description"),
    industry: value(formData, "industry"),
  });
  if (!parsed.success) {
    return {
      ...EMPTY_FORM_STATE,
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const { user } = await requireBusiness();
  const existing = await getOwnBusinessProfile(user.id);
  const profileResult = existing
    ? await updateOwnBusinessProfile(user.id, parsed.data)
    : await createOwnBusinessProfile(user.id, parsed.data);
  if (!profileResult.ok) {
    return { ...EMPTY_FORM_STATE, message: profileResult.message };
  }

  const completion = await completeBusinessOnboarding(user.id);
  if (!completion.ok) {
    return { ...EMPTY_FORM_STATE, message: completion.message };
  }

  revalidatePath("/business");
  revalidatePath("/business/onboarding");
  redirect("/business");
}
