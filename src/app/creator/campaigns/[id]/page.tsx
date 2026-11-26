import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { requireCreator } from "@/lib/auth/session";
import { getCampaignById, hasAppliedToCampaign } from "@/services/campaign.service";
import { getOwnCreatorProfile } from "@/services/creator-profile.service";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApplyToCampaignForm } from "./apply-form";

export const metadata = { title: "Campaign details" };

/**
 * Campaign detail page. Shows a single campaign with an "Apply" button
 * (or "Already applied" if the creator has applied). Streams behind
 * Suspense.
 */
export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<CampaignSkeleton />}>
      <CampaignLoader params={params} />
    </Suspense>
  );
}

async function CampaignLoader({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const { user } = await requireCreator();
  const [campaign, applied, creatorProfile] = await Promise.all([
    getCampaignById(id),
    hasAppliedToCampaign(user.id, id),
    getOwnCreatorProfile(user.id),
  ]);

  if (!campaign) {
    notFound();
  }

  return (
    <CampaignView
      campaign={campaign}
      applied={applied}
      onboardingCompleted={creatorProfile?.onboarding_completed ?? false}
    />
  );
}

function CampaignView({
  campaign,
  applied,
  onboardingCompleted,
}: {
  campaign: NonNullable<Awaited<ReturnType<typeof getCampaignById>>>;
  applied: boolean;
  onboardingCompleted: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link
        href="/creator/discover"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline underline-offset-4 mb-6"
      >
        <ChevronRightIcon className="size-4 rotate-180" /> Back to browse
      </Link>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <CardContent className="p-0 relative aspect-[4/3] overflow-hidden bg-muted">
              <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground text-sm">
                Campaign media
              </div>
              <Badge
                className="absolute top-3 left-3 z-10"
                variant={
                  campaign.collaboration_type === "paid" ? "default" : "outline"
                }
              >
                {campaign.collaboration_type.replace(/_/g, " ")}
              </Badge>
            </CardContent>
            <CardHeader>
              <CardTitle>{campaign.title}</CardTitle>
              <CardDescription className="text-sm">
                {campaign.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <Detail label="Category" value={campaign.category} />
              <Detail
                label="Platforms"
                value={campaign.platforms
                  .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
                  .join(", ")}
              />
              <Detail
                label="Budget"
                value={
                  campaign.budget_min !== null && campaign.budget_max !== null
                    ? `$${campaign.budget_min} – $${campaign.budget_max} ${campaign.currency}`
                    : "On request"
                }
              />
              <Detail
                label="Deadline"
                value={
                  campaign.application_deadline
                    ? new Date(campaign.application_deadline).toLocaleDateString(
                        undefined,
                        { month: "long", day: "numeric", year: "numeric" },
                      )
                    : "No deadline"
                }
              />
              <Detail
                label="Location"
                value={campaign.location ?? "Remote / not specified"}
              />
              <Detail
                label="Deliverables"
                value={
                  campaign.deliverables.length > 0
                    ? campaign.deliverables.join(", ")
                    : "Not specified"
                }
                muted
              />
            </CardContent>
          </Card>

          {campaign.business && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>Business</span>
                  <Badge variant="secondary" className="text-xs">
                    Partner
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex shrink-0 items-center justify-center size-10 rounded-full bg-muted">
                    <span className="text-sm font-medium">
                      {campaign.business.company_name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {campaign.business.company_name}
                    </p>
                    {campaign.business.industry && (
                      <p className="text-xs text-muted-foreground">
                        {campaign.business.industry}
                      </p>
                    )}
                  </div>
                </div>
                {campaign.business.website && (
                  <p className="text-sm text-muted-foreground">
                    {campaign.business.website}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-4">
          <ApplyCard
            campaignId={campaign.id}
            applied={applied}
            onboardingCompleted={onboardingCompleted}
          />
        </div>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="grid gap-1">
      <span className="font-medium">{label}</span>
      <span className={muted ? "text-muted-foreground" : undefined}>{value}</span>
    </div>
  );
}

function ApplyCard({
  campaignId,
  applied,
  onboardingCompleted,
}: {
  campaignId: string;
  applied: boolean;
  onboardingCompleted: boolean;
}) {
  if (applied) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Application sent</CardTitle>
          <CardDescription>
            You have already applied to this campaign.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href="/creator/applications">View my applications</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!onboardingCompleted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Apply</CardTitle>
          <CardDescription>
            Complete onboarding before applying to campaigns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/creator/onboarding">Complete onboarding</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <ApplyToCampaignForm campaignId={campaignId} />;
}

function CampaignSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="h-8 w-32 animate-pulse rounded-xl bg-muted" />
      <div className="mt-6 rounded-2xl border border-border bg-card shadow-[0_18px_40px_color-mix(in_srgb,var(--foreground)_5%,transparent)]">
        <div className="h-64 animate-pulse rounded-2xl bg-card" />
        <div className="p-6 space-y-3">
          <div className="h-4 w-48 animate-pulse rounded-xl bg-muted" />
          <div className="h-4 w-full animate-pulse rounded-xl bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded-xl bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
