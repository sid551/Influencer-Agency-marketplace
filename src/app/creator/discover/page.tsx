import { connection } from "next/server";
import { Suspense } from "react";

import { requireCreator } from "@/lib/auth/session";
import { listDiscoverableCampaigns } from "@/services/campaign.service";
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
  await requireCreator();
  const campaigns = await listDiscoverableCampaigns();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Discover campaigns</h1>
        <p className="text-sm text-muted-foreground">
          Browse open collaborations and apply to the ones that fit you.
        </p>
      </div>
      <CampaignDiscovery campaigns={campaigns} />
    </div>
  );
}

function DiscoverSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
      <div className="mt-6 h-4 w-full max-w-md animate-pulse rounded-md bg-muted" />
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-80 rounded-lg animate-pulse bg-card" />
        ))}
      </div>
    </div>
  );
}
