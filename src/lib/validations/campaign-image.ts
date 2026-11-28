/** Client/server-shared rules for campaign photos uploaded to Cloudinary. */

export const CAMPAIGN_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type CampaignImageType = (typeof CAMPAIGN_IMAGE_TYPES)[number];

/** Leaves room for multipart overhead inside the 12 MB server action limit. */
export const CAMPAIGN_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const CAMPAIGN_IMAGE_ALT_MAX = 150;
export const CAMPAIGN_IMAGE_ACCEPT = CAMPAIGN_IMAGE_TYPES.join(",");

/** Returns a user-facing error, or null when the selected file is usable. */
export function campaignImageError(file: File): string | null {
  if (file.size === 0) return "That file is empty.";
  if (file.size > CAMPAIGN_IMAGE_MAX_BYTES) return "Campaign photos must be 8 MB or smaller.";
  if (!CAMPAIGN_IMAGE_TYPES.includes(file.type as CampaignImageType)) {
    return "Use a JPEG, PNG or WebP image.";
  }
  return null;
}
