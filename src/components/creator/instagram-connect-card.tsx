"use client";

import { useState, type ReactNode } from "react";
import { CameraIcon, CheckIcon, Loader2Icon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { verificationStatusLabel } from "@/lib/labels";
import type { InstagramNotice } from "@/lib/instagram-oauth";
import type { SocialAccount } from "@/types/creator.types";

interface InstagramConnectCardProps {
  /** The creator's OAuth-verified Instagram account, if connected. */
  account?: SocialAccount;
  /** Sanitized same-origin path the callback returns to. */
  returnTo: string;
  notice?: InstagramNotice | null;
  /** False when the Meta app credentials are not configured yet. */
  configured?: boolean;
  /** Settings renders a disconnect button into this slot. */
  disconnectButton?: ReactNode;
}

/**
 * Hypee-style onboarding card: connect Instagram to get paid deals, with a
 * self-reported fallback below it in the social-accounts step. The button is
 * a plain link to the server route so the OAuth URL is built server-side.
 */
export function InstagramConnectCard({
  account,
  returnTo,
  notice,
  configured = true,
  disconnectButton,
}: InstagramConnectCardProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const href = `/api/auth/instagram?return=${encodeURIComponent(returnTo)}`;

  return (
    <section className="grid gap-3 rounded-2xl border border-border bg-muted/30 p-4">
      <div className="flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
          style={{
            background:
              "linear-gradient(135deg, #feda75 0%, #fa7e1e 35%, #d62976 70%, #4f5bd5 100%)",
          }}
          aria-hidden
        >
          <CameraIcon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium">
            {account ? "Instagram connected" : "Connect Instagram to get paid deals"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {account ? (
              <>
                {`@${account.username}`}
                {account.follower_count > 0
                  ? ` · ${account.follower_count.toLocaleString("en-US")} followers`
                  : ""}
              </>
            ) : (
              "You need it to apply to campaigns, and brands see your real numbers. You can skip this and do it later."
            )}
          </p>
        </div>
        {account ? (
          <Badge variant="outline" className="shrink-0 text-xs">
            {verificationStatusLabel(account.verification_status)}
          </Badge>
        ) : null}
      </div>

      {notice?.error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not connect Instagram</AlertTitle>
          <AlertDescription>{notice.error}</AlertDescription>
        </Alert>
      ) : null}

      {notice?.status === "connected" && account ? (
        <Alert>
          <CheckIcon />
          <AlertTitle>Instagram connected</AlertTitle>
          <AlertDescription>
            Ownership is verified and your real numbers are on your profile.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {account ? (
          <>
            <Badge variant="secondary" className="text-xs">
              <CheckIcon />
              Verified with Instagram
            </Badge>
            {disconnectButton}
          </>
        ) : (
          <>
            <Button asChild disabled={!configured || isConnecting}>
              <a href={href} onClick={() => setIsConnecting(true)}>
                {isConnecting ? (
                  <>
                    <Loader2Icon className="animate-spin" />
                    Connecting…
                  </>
                ) : (
                  "Connect Instagram"
                )}
              </a>
            </Button>
            {!configured ? (
              <p className="text-xs text-muted-foreground">
                Available once the Meta app credentials are configured.
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
