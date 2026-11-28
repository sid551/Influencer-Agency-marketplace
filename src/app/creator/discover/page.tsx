import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { SparklesIcon } from "lucide-react";

import { requireCreator } from "@/lib/auth/session";
import { getOwnCreatorProfile } from "@/services/creator-profile.service";
import {
  getRecommendedCampaigns,
  RECOMMENDATION_PAGE_SIZE,
} from "@/services/recommendation.service";
import { RECOMMENDATION_SECTIONS } from "@/lib/recommendation";
import type { RecommendationPage } from "@/types/recommendation.types";
import { CampaignDiscovery } from "./page-client";

export const metadata = { title: "Discover campaigns" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Campaign discovery page. Each section is fetched independently from
 * the recommendation RPC with its own page of results — the whole
 * catalogue is never loaded into the browser. Streams behind Suspense.
 */
export default function CreatorDiscoverPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<DiscoverSkeleton />}>
      <DiscoverLoader searchParams={searchParams} />
    </Suspense>
  );
}

async function DiscoverLoader({ searchParams }: PageProps) {
  await connection();
  const { user } = await requireCreator();
  const creatorProfile = await getOwnCreatorProfile(user.id);

  // Discovery is the creator landing page, so it carries the onboarding gate.
  if (!creatorProfile?.onboarding_completed) {
    redirect("/creator/onboarding");
  }

  const params = await searchParams;
  const results = await Promise.all(
    RECOMMENDATION_SECTIONS.map((section) => {
      const raw = params[section.key];
      const value = Array.isArray(raw) ? raw[0] : raw;
      const page = Number.parseInt(value ?? "1", 10);
      return getRecommendedCampaigns(
        section.key,
        Number.isFinite(page) && page > 0 ? page : 1,
        RECOMMENDATION_PAGE_SIZE,
      );
    }),
  );

  const failed = results.find((result) => !result.ok);
  const sections: RecommendationPage[] = results.flatMap((result) =>
    result.ok ? [result.data] : [],
  );

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
            Campaigns are ranked against your niches. Browse your best
            matches, related briefs and everything else that&apos;s open.
          </p>
        </div>
      </div>

      {!failed && sections.length === RECOMMENDATION_SECTIONS.length ? (
        <CampaignDiscovery sections={sections} />
      ) : (
        <div className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center" role="alert">
          <p className="text-sm font-medium">We couldn&apos;t load your recommendations.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Please refresh the page. Your campaigns are safe.
          </p>
        </div>
      )}
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
      {Array.from({ length: 3 }).map((_, section) => (
        <div key={section} className="mt-8">
          <div className="h-6 w-56 animate-pulse rounded-xl bg-muted" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl border border-border bg-card" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
