import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { SparklesIcon } from "lucide-react";

import { requireCreator } from "@/lib/auth/session";
import { listDiscoverableCampaigns } from "@/services/campaign.service";
import { getOwnCreatorProfile } from "@/services/creator-profile.service";
import { CampaignDiscovery } from "./page-client";

export const metadata = { title: "Discover campaigns" };

/**
 * Campaign discovery page. Lists published/active campaigns with
 * client-side filtering. Streams in behind Suspense.
 */
export default function CreatorDiscoverPage() {
  return (
    <Suspense fallback={<DiscoverSkeleton />}>
      <DiscoverLoader />
    </Suspense>
  );
}

async function DiscoverLoader() {
  await connection();
  const { user } = await requireCreator();
  const creatorProfile = await getOwnCreatorProfile(user.id);

  // Discovery is the creator landing page, so it now carries the onboarding
  // gate that used to live only on the old dashboard route.
  if (!creatorProfile?.onboarding_completed) {
    redirect("/creator/onboarding");
  }

  const campaigns = await listDiscoverableCampaigns();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-border pb-7">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <SparklesIcon className="size-3.5" />
            Creator marketplace
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Find your next collaboration
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse open campaigns, filter by what you do best, and apply in a
            couple of clicks.
          </p>
        </div>
      </div>
      <CampaignDiscovery campaigns={campaigns} />
    </div>
  );
}

function DiscoverSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-md border-b border-border pb-7">
        <div className="h-5 w-36 animate-pulse rounded-full bg-muted" />
        <div className="mt-4 h-9 w-72 animate-pulse rounded-xl bg-muted" />
        <div className="mt-3 h-4 w-full animate-pulse rounded-xl bg-muted" />
      </div>
      <div className="mt-6 h-20 animate-pulse rounded-2xl border border-border bg-card" />
      <div className="mt-3 h-28 animate-pulse rounded-2xl border border-border bg-card" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-80 animate-pulse rounded-2xl border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}
