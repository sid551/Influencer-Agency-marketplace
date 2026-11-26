"use server";

import { revalidatePath } from "next/cache";

import { requireBusiness } from "@/lib/auth/session";
import { fieldErrorsOf } from "@/lib/validations/form-errors";
import { businessProfileSchema } from "@/lib/validations/business";
import { updateOwnBusinessProfile } from "@/services/business-profile.service";
import {
  EMPTY_FORM_STATE,
  type FormActionState,
} from "@/types/action-state.types";

function value(formData: FormData, name: string): string {
  const raw = formData.get(name);
  return typeof raw === "string" ? raw : "";
}

/** Save company details edited from the business profile page. */
export async function saveBusinessProfile(
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
  const result = await updateOwnBusinessProfile(user.id, parsed.data);
  if (!result.ok) {
    return { ...EMPTY_FORM_STATE, message: result.message };
  }

  revalidatePath("/business");
  revalidatePath("/business/profile");
  return {
    ok: true,
    message: "Company profile saved.",
    fieldErrors: {},
  };
}
