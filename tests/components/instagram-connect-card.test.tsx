import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InstagramConnectCard } from "@/components/creator/instagram-connect-card";
import { readInstagramNotice } from "@/lib/instagram-oauth";
import type { SocialAccount } from "@/types/creator.types";

const account: SocialAccount = {
  id: "11111111-1111-1111-1111-111111111111",
  profile_id: "22222222-2222-2222-2222-222222222222",
  platform: "instagram",
  username: "creator.handle",
  platform_user_id: "17841400000000000",
  follower_count: 12000,
  verification_status: "verified",
  verification_method: "oauth",
  verified_at: "2026-11-27T10:00:00.000Z",
  created_at: "2026-11-27T09:00:00.000Z",
  updated_at: "2026-11-27T10:00:00.000Z",
};

describe("InstagramConnectCard", () => {
  it("links to the server OAuth route from onboarding", () => {
    render(<InstagramConnectCard returnTo="/creator/onboarding" />);

    expect(
      screen.getByRole("link", { name: "Connect Instagram" }),
    ).toHaveAttribute("href", "/api/auth/instagram?return=%2Fcreator%2Fonboarding");
    expect(screen.getByText(/get paid deals/i)).toBeInTheDocument();
  });

  it("disables connecting until Meta credentials are configured", () => {
    render(<InstagramConnectCard returnTo="/creator/settings" configured={false} />);

    expect(screen.getByRole("link", { name: "Connect Instagram" })).toHaveAttribute(
      "disabled",
    );
    expect(screen.getByText(/once the Meta app credentials/i)).toBeInTheDocument();
  });

  it("shows a verified account and the success notice after the callback", () => {
    render(
      <InstagramConnectCard
        account={account}
        returnTo="/creator/onboarding"
        notice={readInstagramNotice({ instagram: "connected" })}
      />,
    );

    expect(screen.getByText(/@creator\.handle/)).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText(/Ownership is verified/)).toBeInTheDocument();
  });

  it("shows a friendly error notice and keeps the retry link", () => {
    render(
      <InstagramConnectCard
        returnTo="/creator/onboarding"
        notice={readInstagramNotice({ instagram_error: "access_denied" })}
      />,
    );

    expect(screen.getByText("Could not connect Instagram")).toBeInTheDocument();
    expect(screen.getByText(/You cancelled Instagram connecting/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Connect Instagram" })).toBeInTheDocument();
  });
});
