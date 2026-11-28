import { uuidSchema } from "@/lib/validations/ids";

/**
 * Campaign URLs use the stable slug. The UUID remains the internal key and
 * still resolves in page loaders so old bookmarks keep working.
 */
export interface CampaignReference {
  id: string;
  slug?: string | null;
}

export function campaignSlug(campaign: CampaignReference): string {
  return campaign.slug || campaign.id;
}

/** Only UUIDs query the id column; everything else is treated as a slug. */
export function campaignLookupColumn(reference: string): "id" | "slug" {
  return uuidSchema.safeParse(reference).success ? "id" : "slug";
}

export function campaignPath(
  campaign: CampaignReference,
  suffix?: "edit" | "applications",
): string {
  const base = `/business/campaigns/${campaignSlug(campaign)}`;
  return suffix ? `${base}/${suffix}` : base;
}

export function campaignMessagesPath(campaign: CampaignReference): string {
  return `/business/messages/campaigns/${campaignSlug(campaign)}`;
}

export function creatorCampaignPath(campaign: CampaignReference): string {
  return `/creator/campaigns/${campaignSlug(campaign)}`;
}
