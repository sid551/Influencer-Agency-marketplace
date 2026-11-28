import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ServiceResult } from "./profile.service";
import type {
  RecommendationPage,
  RecommendationSection,
  RecommendedCampaign,
} from "@/types/recommendation.types";

/**
 * Niche-based campaign recommendations.
 *
 * All scoring happens inside the Postgres RPC
 * `recommend_creator_campaigns` (migration 20261128000002). The
 * function is SECURITY INVOKER, so the existing `campaigns` RLS
 * policy still applies, and it only returns eligible campaigns
 * (published/active, deadline not passed). We never fetch the whole
 * catalogue client-side — each call is one paginated section.
 */

export const RECOMMENDATION_PAGE_SIZE = 6;

export type { RecommendationPage, RecommendationSection, RecommendedCampaign };

/**
 * Fetch one paginated section of the personalised feed for the
 * signed-in creator. Errors are surfaced (not swallowed) so the page
 * can render its error state.
 */
export async function getRecommendedCampaigns(
  section: RecommendationSection,
  page = 1,
  pageSize: number = RECOMMENDATION_PAGE_SIZE,
): Promise<ServiceResult<RecommendationPage>> {
  const supabase = await createClient();
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.max(1, Math.min(50, Math.floor(pageSize)));

  const { data, error } = await supabase.rpc("recommend_creator_campaigns", {
    p_section: section,
    p_limit: safeSize,
    p_offset: (safePage - 1) * safeSize,
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  const items = (data ?? []) as RecommendedCampaign[];
  const total = items.length > 0 ? Number(items[0].total_count) : 0;

  return {
    ok: true,
    data: {
      section,
      items,
      total,
      page: safePage,
      pageSize: safeSize,
      totalPages: Math.max(1, Math.ceil(total / safeSize)),
    },
  };
}
