import { DEFAULT_CURRENCY } from "@/lib/money";
import type { Campaign } from "@/types/campaign.types";

/** Plain form values shared by the server pages and the client campaign form. */
export interface CampaignFormDefaults {
  campaignId: string;
  title: string;
  description: string;
  category: string;
  platforms: string[];
  collaboration_type: string;
  budget_min: string;
  budget_max: string;
  currency: string;
  deliverables: string;
  application_deadline: string;
  location: string;
  status: string;
}

export function campaignFormDefaults(
  campaign?: Campaign | null,
): CampaignFormDefaults {
  return {
    campaignId: campaign?.id ?? "",
    title: campaign?.title ?? "",
    description: campaign?.description ?? "",
    category: campaign?.category ?? "",
    platforms: campaign?.platforms ?? ["instagram"],
    collaboration_type: campaign?.collaboration_type ?? "paid",
    budget_min: campaign?.budget_min != null ? String(campaign.budget_min) : "",
    budget_max: campaign?.budget_max != null ? String(campaign.budget_max) : "",
    currency: DEFAULT_CURRENCY,
    deliverables: campaign?.deliverables.join("\n") ?? "",
    application_deadline: campaign?.application_deadline?.slice(0, 10) ?? "",
    location: campaign?.location ?? "",
    status: campaign?.status ?? "draft",
  };
}
