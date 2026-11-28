import { DEFAULT_CURRENCY } from "@/lib/money";
import type { Campaign, CampaignStatus } from "@/types/campaign.types";

/** Plain form values shared by the server pages and the client campaign form. */
export interface CampaignFormDefaults {
  campaignId: string;
  title: string;
  description: string;
  category: string;
  platforms: string[];
  target_niches: string[];
  collaboration_type: string;
  budget_min: string;
  budget_max: string;
  currency: string;
  deliverables: string;
  application_deadline: string;
  location: string;
  image_url: string | null;
  image_public_id: string | null;
  image_alt: string;
  status: CampaignStatus;
}

export function campaignFormDefaults(
  campaign?: Campaign | null,
  targetNiches: string[] = [],
): CampaignFormDefaults {
  return {
    campaignId: campaign?.id ?? "",
    title: campaign?.title ?? "",
    description: campaign?.description ?? "",
    category: campaign?.category ?? "",
    platforms: campaign?.platforms ?? ["instagram"],
    target_niches: targetNiches,
    collaboration_type: campaign?.collaboration_type ?? "paid",
    budget_min: campaign?.budget_min != null ? String(campaign.budget_min) : "",
    budget_max: campaign?.budget_max != null ? String(campaign.budget_max) : "",
    currency: DEFAULT_CURRENCY,
    deliverables: campaign?.deliverables.join("\n") ?? "",
    application_deadline: campaign?.application_deadline?.slice(0, 10) ?? "",
    location: campaign?.location ?? "",
    image_url: campaign?.image_url ?? null,
    image_public_id: campaign?.image_public_id ?? null,
    image_alt: campaign?.image_alt ?? "",
    status: campaign?.status ?? "draft",
  };
}
