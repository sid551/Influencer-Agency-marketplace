import "server-only";

import { v2 as cloudinary } from "cloudinary";

import { campaignImageError } from "@/lib/validations/campaign-image";
import type { ServiceResult } from "./profile.service";

/** Only these Supabase columns are written from a Cloudinary upload response. */
export interface CampaignImageAsset {
  image_url: string;
  image_public_id: string;
}

function configuredCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) return null;

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  return cloudinary;
}

function uploadFolder(): string {
  const segments = (process.env.CLOUDINARY_UPLOAD_FOLDER ?? "campaign-images")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  return segments.join("/") || "campaign-images";
}

function isExpectedUrl(url: string): boolean {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (!cloudName) return false;

  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com" &&
      parsed.pathname.startsWith(`/${cloudName}/image/upload/`) &&
      parsed.search === ""
    );
  } catch {
    return false;
  }
}

/**
 * Upload one campaign photo to Cloudinary with signed credentials. The File
 * is converted to a data URI because server actions cannot pass a path that
 * Cloudinary can read. Only the returned URL/public_id reach Supabase.
 */
export async function uploadCampaignImage(
  userId: string,
  file: File,
): Promise<ServiceResult<CampaignImageAsset>> {
  const fileError = campaignImageError(file);
  if (fileError) return { ok: false, message: fileError };

  const client = configuredCloudinary();
  if (!client) {
    return {
      ok: false,
      message: "Campaign image uploads are not configured yet. Ask the site owner to add the Cloudinary keys.",
    };
  }

  let publicId = "";
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await client.uploader.upload(
      `data:${file.type};base64,${bytes.toString("base64")}`,
      {
        folder: `${uploadFolder()}/${userId}`,
        public_id: crypto.randomUUID(),
        resource_type: "image",
        overwrite: false,
        unique_filename: false,
      },
    );

    publicId = result.public_id;
    if (!publicId || !isExpectedUrl(result.secure_url)) {
      await removeCampaignImage(publicId);
      return { ok: false, message: "Cloudinary returned an unexpected image URL." };
    }

    return {
      ok: true,
      data: { image_url: result.secure_url, image_public_id: publicId },
    };
  } catch {
    // Avoid leaving an orphaned asset if validation or the response fails.
    await removeCampaignImage(publicId);
    return { ok: false, message: "Could not upload the campaign photo. Please try again." };
  }
}

/** Best-effort cleanup; the campaign row is already saved by the caller. */
export async function removeCampaignImage(
  publicId: string | null | undefined,
): Promise<void> {
  if (!publicId) return;
  if (!/^[A-Za-z0-9_./-]{1,255}$/.test(publicId)) return;

  const client = configuredCloudinary();
  if (!client) return;

  try {
    await client.uploader.destroy(publicId, { invalidate: true });
  } catch {
    // Cleanup is optional; a stale asset does not break the saved campaign.
  }
}
