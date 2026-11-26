"use server";

import { requireCreator } from "@/lib/auth/session";
import {
  addOwnPortfolioItem,
  listOwnPortfolioItems,
  removeOwnPortfolioItem,
} from "@/services/portfolio.service";
import { portfolioItemSchema } from "@/lib/validations/portfolio";
import { uuidSchema } from "@/lib/validations/ids";

export interface PortfolioActionState {
  ok: boolean;
  message: string | null;
  fieldErrors: Record<string, string[]>;
  item?: Awaited<ReturnType<typeof listOwnPortfolioItems>>[number];
}

const EMPTY_STATE: PortfolioActionState = {
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

/** Add a portfolio item for the signed-in creator. */
export async function addPortfolioItem(
  _prev: PortfolioActionState,
  formData: FormData,
): Promise<PortfolioActionState> {
  const raw = Object.fromEntries(formData.entries());

  const parsed = portfolioItemSchema.safeParse(raw);
  if (!parsed.success) {
    return { ...EMPTY_STATE, fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const { user } = await requireCreator();

  const result = await addOwnPortfolioItem(user.id, {
    title: parsed.data.title.trim(),
    description: parsed.data.description ?? null,
    media_type: parsed.data.media_type,
    media_url: parsed.data.media_url,
  });

  if (!result.ok) {
    return { ...EMPTY_STATE, message: result.message };
  }

  return { ...EMPTY_STATE, ok: true, item: result.data };
}

/** Delete a portfolio item. Matches the (prev, formData) pattern for useActionState. */
export async function deletePortfolioItem(
  _prev: PortfolioActionState,
  formData: FormData,
): Promise<PortfolioActionState> {
  const itemId = uuidSchema.safeParse(formData.get("itemId"));
  if (!itemId.success) {
    return { ...EMPTY_STATE, message: "Item not found." };
  }

  const { user } = await requireCreator();

  const result = await removeOwnPortfolioItem(user.id, itemId.data);
  if (!result.ok) {
    return { ...EMPTY_STATE, message: result.message };
  }

  return { ...EMPTY_STATE, ok: true };
}
