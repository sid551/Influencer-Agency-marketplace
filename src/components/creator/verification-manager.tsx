"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2Icon, ShieldCheckIcon, XIcon } from "lucide-react";

import {
  cancelVerificationAction,
  requestVerificationAction,
} from "@/app/creator/profile/verification-actions";
import type { VerificationActionState } from "@/app/creator/profile/verification-actions";
import {
  REQUESTABLE_VERIFICATION_TYPES,
  VERIFICATION_EVIDENCE_MAX_BYTES,
} from "@/lib/validations/verification";
import type {
  SocialAccount,
  VerificationStatus,
  VerificationType,
  VerificationWithSocial,
} from "@/types/creator.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMPTY_STATE: VerificationActionState = {
  ok: false,
  message: null,
  fieldErrors: {},
};

const TYPE_LABELS: Record<VerificationType, string> = {
  email: "Email address",
  phone: "Phone number",
  identity: "Identity document",
  instagram_ownership: "Instagram ownership",
  youtube_ownership: "YouTube ownership",
  audience_quality: "Audience quality",
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
};

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function statusVariant(status: VerificationStatus) {
  if (status === "verified") return "default" as const;
  if (status === "pending" || status === "manual_review") return "secondary" as const;
  if (status === "rejected" || status === "revoked") return "destructive" as const;
  return "outline" as const;
}

/** Creator-facing verification centre: open manual-review claims and see
 *  their status. Nothing is auto-verified — review is admin-controlled. */
export function VerificationManager({
  claims,
  accounts,
}: {
  claims: VerificationWithSocial[];
  accounts: SocialAccount[];
}) {
  return (
    <div className="grid gap-6">
      {/* Revalidation adds a claim, which remounts the form with clean state. */}
      <RequestCard key={claims.length} accounts={accounts} />
      <ClaimsCard claims={claims} />
    </div>
  );
}

function RequestCard({ accounts }: { accounts: SocialAccount[] }) {
  const [type, setType] = useState<(typeof REQUESTABLE_VERIFICATION_TYPES)[number]>(
    "identity",
  );
  const [socialAccountId, setSocialAccountId] = useState("");
  const [state, formAction, isPending] = useActionState(
    requestVerificationAction,
    EMPTY_STATE,
  );

  // Feedback is an external side effect; the success path remounts this
  // card with a fresh key, clearing the form without setState in an effect.
  useEffect(() => {
    if (!state.ok && !state.message) return;
    if (state.ok) toast.success(state.message ?? "Request submitted.");
    else if (state.message) toast.error(state.message);
  }, [state]);

  const isOwnership = type === "instagram_ownership" || type === "youtube_ownership";
  const platform = isOwnership ? type.replace("_ownership", "") : null;
  const matchingAccounts = platform
    ? accounts.filter((account) => account.platform === platform)
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheckIcon className="size-4" />
          Request verification
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="verification-type">What would you like verified?</Label>
            <Select
              name="type"
              value={type}
              onValueChange={(value) => {
                setType(
                  value as (typeof REQUESTABLE_VERIFICATION_TYPES)[number],
                );
                setSocialAccountId("");
              }}
            >
              <SelectTrigger id="verification-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REQUESTABLE_VERIFICATION_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {TYPE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state.fieldErrors.type ? (
              <p className="text-xs text-destructive">{state.fieldErrors.type[0]}</p>
            ) : null}
          </div>

          {isOwnership ? (
            <div className="grid gap-2">
              <Label htmlFor="social-account">Social account</Label>
              <Select
                name="social_account_id"
                value={socialAccountId}
                onValueChange={setSocialAccountId}
              >
                <SelectTrigger id="social-account" className="w-full">
                  <SelectValue
                    placeholder={
                      matchingAccounts.length === 0
                        ? "No matching account linked"
                        : "Choose an account"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {matchingAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      @{account.username}
                      {account.verification_status !== "unverified"
                        ? ` (${titleCase(account.verification_status)})`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {matchingAccounts.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Link your {PLATFORM_LABELS[platform ?? ""] ?? platform} account in{" "}
                  <Link href="/creator/settings" className="underline">
                    settings
                  </Link>{" "}
                  first.
                </p>
              ) : null}
              {state.fieldErrors.social_account_id ? (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.social_account_id[0]}
                </p>
              ) : null}
            </div>
          ) : null}

          {type === "identity" || type === "audience_quality" ? (
            <div className="grid gap-2">
              <Label htmlFor="evidence">
                Evidence {type === "identity" ? "(required)" : "(optional)"}
              </Label>
              <Input
                id="evidence"
                name="evidence"
                type="file"
                accept="image/png,image/jpeg,application/pdf"
                className="cursor-pointer"
                aria-describedby="evidence-hint"
              />
              <p id="evidence-hint" className="text-xs text-muted-foreground">
                PNG, JPEG or PDF up to{" "}
                {Math.round(VERIFICATION_EVIDENCE_MAX_BYTES / 1024 / 1024)} MB. Stored
                privately and only visible to reviewers.
              </p>
              {state.fieldErrors.evidence ? (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.evidence[0]}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              Submit for review
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ClaimsCard({ claims }: { claims: VerificationWithSocial[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your requests</CardTitle>
      </CardHeader>
      <CardContent>
        {claims.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No verification requests yet.
          </p>
        ) : (
          <ul className="grid gap-2">
            {claims.map((claim) => (
              <li
                key={claim.id}
                className="rounded-2xl border border-border px-3 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">
                        {TYPE_LABELS[claim.type] ?? titleCase(claim.type)}
                      </p>
                      <Badge variant={statusVariant(claim.status)}>
                        {titleCase(claim.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Submitted {claim.created_at.slice(0, 10)}
                      {claim.social_account
                        ? ` · @${claim.social_account.username}`
                        : ""}
                      {claim.evidence_path ? " · evidence attached" : ""}
                    </p>
                    {claim.review_notes ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Reviewer note: {claim.review_notes}
                      </p>
                    ) : null}
                    {claim.expires_at ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Expires {claim.expires_at.slice(0, 10)}
                      </p>
                    ) : null}
                  </div>
                  {(claim.status === "pending" || claim.status === "expired") && (
                    <CancelClaimForm claimId={claim.id} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function CancelClaimForm({ claimId }: { claimId: string }) {
  const [state, formAction, isPending] = useActionState(
    cancelVerificationAction,
    EMPTY_STATE,
  );

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="claimId" value={claimId} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={isPending}
        aria-label="Cancel verification request"
      >
        {isPending ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <XIcon className="size-4" />
        )}
        Cancel
      </Button>
    </form>
  );
}
