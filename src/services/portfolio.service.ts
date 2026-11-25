import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PortfolioItem } from "@/types/creator.types";
import type { ServiceResult } from "./profile.service";

/** Columns a user may update (mirrors the column-level UPDATE grant). */
export type PortfolioItemPatch = Partial<
  Pick<
    PortfolioItem,
    "title" | "description" | "media_type" | "media_url" | "position"
  >
>;

/** The caller's own portfolio items, ordered by position. */
export async function listOwnPortfolioItems(
  userId: string,
): Promise<PortfolioItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portfolio_items")
    .select("*")
    .eq("profile_id", userId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return [];
  return (data as PortfolioItem[]) ?? [];
}

/** Add a portfolio item for the caller. */
export async function addOwnPortfolioItem(
  userId: string,
  input: {
    title: string;
    description?: string | null;
    media_type: "image" | "video_link" | "content_sample";
    media_url: string;
    position?: number;
  },
): Promise<ServiceResult<PortfolioItem>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portfolio_items")
    .insert({
      profile_id: userId,
      title: input.title,
      description: input.description ?? null,
      media_type: input.media_type,
      media_url: input.media_url,
      position: input.position ?? 0,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    return { ok: false, message: "Could not add portfolio item." };
  }

  if (!data) {
    return { ok: false, message: "Could not add portfolio item." };
  }
  return { ok: true, data: data as PortfolioItem };
}

/** Update one of the caller's own portfolio items. */
export async function updateOwnPortfolioItem(
  userId: string,
  itemId: string,
  patch: PortfolioItemPatch,
): Promise<ServiceResult<PortfolioItem>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portfolio_items")
    .update(patch)
    .eq("id", itemId)
    .eq("profile_id", userId)
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") {
      return {
        ok: false,
        message: "You don't have permission to make this change.",
      };
    }
    return { ok: false, message: "Could not save your changes." };
  }

  if (!data) {
    return { ok: false, message: "Portfolio item not found." };
  }
  return { ok: true, data: data as PortfolioItem };
}

/** Remove one of the caller's own portfolio items. */
export async function removeOwnPortfolioItem(
  userId: string,
  itemId: string,
): Promise<ServiceResult<null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portfolio_items")
    .delete()
    .eq("id", itemId)
    .eq("profile_id", userId)
    .select("id");

  if (error) {
    return { ok: false, message: "Could not remove that item." };
  }
  if (!data || data.length === 0) {
    return { ok: false, message: "That item was not found." };
  }
  return { ok: true, data: null };
}
