import { describe, expect, it } from "vitest";

import {
  campaignImageError,
  CAMPAIGN_IMAGE_MAX_BYTES,
} from "@/lib/validations/campaign-image";

function imageFile(size: number, type = "image/png"): File {
  return { size, type } as File;
}

describe("campaignImageError", () => {
  it("accepts supported image types within the size limit", () => {
    expect(campaignImageError(imageFile(1024, "image/jpeg"))).toBeNull();
    expect(campaignImageError(imageFile(1024, "image/png"))).toBeNull();
    expect(campaignImageError(imageFile(1024, "image/webp"))).toBeNull();
  });

  it("rejects empty, oversized and unsupported files", () => {
    expect(campaignImageError(imageFile(0))).toBe("That file is empty.");
    expect(
      campaignImageError(imageFile(CAMPAIGN_IMAGE_MAX_BYTES + 1)),
    ).toBe("Campaign photos must be 8 MB or smaller.");
    expect(campaignImageError(imageFile(1024, "image/svg+xml"))).toBe(
      "Use a JPEG, PNG or WebP image.",
    );
  });
});
