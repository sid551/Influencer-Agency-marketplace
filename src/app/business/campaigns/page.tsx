import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { PlusIcon } from "lucide-react";

import { requireBusiness } from "@/lib/auth/session";
import {
  listBusinessCampaigns,
} from "@/services/business-campaign.service";
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
import type { Campaign } from "@/types/campaign.types";

export const metadata = { title: "My campaigns" };

export default function BusinessCampaignsPage() {
  return (
    <Suspense fallback={<CampaignsSkeleton />}>
      <CampaignsLoader />
    </Suspense>
  );
}

async function CampaignsLoader() {
  await connection();
  const { user } = await requireBusiness();
  const [profile, campaigns] = await Promise.all([
    getOwnBusinessProfile(user.id),
    listBusinessCampaigns(user.id),
  ]);
  if (!profile) redirect("/business/onboarding");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage the collaborations you publish.
          </p>
        </div>
        <Button asChild>
          <Link href="/business/campaigns/new">
            <PlusIcon />
            New campaign
          </Link>
        </Button>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>All campaigns</CardTitle>
          <CardDescription>
            {campaigns.length === 0
              ? "You haven't published any campaigns yet."
              : `${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"} total.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Use “New campaign” to create your first opportunity for creators.
            </p>
          ) : (
            <ul className="divide-y">
              {campaigns.map((campaign) => (
                <CampaignRow key={campaign.id} campaign={campaign} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CampaignRow({ campaign }: { campaign: Campaign }) {
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Link
          href={`/business/campaigns/${campaign.id}/edit`}
          className="font-medium hover:underline"
        >
          {campaign.title}
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">
          {campaign.category} · {campaign.platforms.join(", ")} · Updated{" "}
          {new Date(campaign.updated_at).toLocaleDateString()}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Badge variant="outline" className="capitalize">
          {campaign.status}
        </Badge>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/business/campaigns/${campaign.id}/edit`}>Edit</Link>
        </Button>
      </div>
    </li>
  );
}

function CampaignsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8" aria-hidden>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-8 h-80" />
    </div>
  );
}
