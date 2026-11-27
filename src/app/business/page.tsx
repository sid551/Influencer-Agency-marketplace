import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ArrowRightIcon, PlusIcon } from "lucide-react";

import { requireBusiness } from "@/lib/auth/session";
import {
  listBusinessCampaignApplicationGroups,
} from "@/services/business-application.service";
import { listBusinessCampaigns } from "@/services/business-campaign.service";
import { countBusinessCollaborations } from "@/services/business-collaboration.service";
import { getOwnBusinessProfile } from "@/services/business-profile.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { BusinessCampaignDashboardItem } from "@/types/business.types";

export const metadata = { title: "Business dashboard" };

export default function BusinessDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardLoader />
    </Suspense>
  );
}

async function DashboardLoader() {
  await connection();
  const { user } = await requireBusiness();
  const [businessProfile, campaigns, collaborationCount] = await Promise.all([
    getOwnBusinessProfile(user.id),
    listBusinessCampaigns(user.id),
    countBusinessCollaborations(user.id),
  ]);

  if (!businessProfile?.onboarding_completed) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Finish setting up your business</CardTitle>
            <CardDescription>
              Add your company details to start publishing campaigns.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/business/onboarding">
                Complete setup
                <ArrowRightIcon />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const groups = await listBusinessCampaignApplicationGroups(user.id, campaigns);
  const applicationCount = groups.reduce(
    (total, group) => total + group.applicationCount,
    0,
  );
  const liveCount = campaigns.filter((campaign) =>
    ["published", "active"].includes(campaign.status),
  ).length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {businessProfile.company_name}.
          </p>
        </div>
        <Button asChild>
          <Link href="/business/campaigns/new">
            <PlusIcon />
            New campaign
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Campaigns" value={campaigns.length} />
        <StatCard label="Live campaigns" value={liveCount} />
        <StatCard label="Applications received" value={applicationCount} />
        <StatCard label="Collaborations" value={collaborationCount} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Campaigns and applications</CardTitle>
              <CardDescription>
                Application counts for each campaign.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/business/campaigns">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No campaigns yet. Create your first one to start receiving
                applications.
              </p>
            ) : (
              <ul className="divide-y">
                {groups.map((group) => (
                  <CampaignApplicationGroup key={group.campaign.id} group={group} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company profile</CardTitle>
            <CardDescription>What creators see about your business.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Industry</p>
              <p>{businessProfile.industry ?? "Not set"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Website</p>
              {businessProfile.website ? (
                <a
                  href={businessProfile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-primary hover:underline"
                >
                  {businessProfile.website}
                </a>
              ) : (
                <p>Not set</p>
              )}
            </div>
            <Button variant="outline" size="sm" asChild className="mt-2">
              <Link href="/business/profile">Edit profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function CampaignApplicationGroup({
  group,
}: {
  group: BusinessCampaignDashboardItem;
}) {
  const { campaign, applicationCount } = group;
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/business/campaigns/${campaign.id}/applications`}
            className="text-sm font-medium hover:underline"
          >
            {campaign.title}
          </Link>
          <p className="text-xs text-muted-foreground">
            {campaign.category} · {campaign.platforms.join(", ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Applications</span>
          <Badge variant="secondary" className="text-xs">
            {applicationCount}
          </Badge>
          <Badge variant="outline" className="text-xs capitalize">
            {campaign.status}
          </Badge>
        </div>
      </div>
    </li>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8" aria-hidden>
      <Skeleton className="h-8 w-52" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="mt-6 h-96" />
    </div>
  );
}
