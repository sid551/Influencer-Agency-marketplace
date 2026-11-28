import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon, MessagesSquareIcon, PencilIcon } from "lucide-react";

import { requireBusiness } from "@/lib/auth/session";
import {
  campaignMessagesPath,
  campaignPath,
  campaignSlug,
} from "@/lib/campaign-paths";
import {
  bidNicheOptions,
  bidSortFromValue,
  BID_SORTS,
  filterBidsByNiche,
  nicheFilterFromValue,
  sortBids,
} from "@/lib/bids";
import {
  applicationStatusVariant,
  campaignStatusVariant,
  formatPrice,
} from "@/lib/business-format";
import {
  applicationFilterFromValue,
  applicationStatusLabel,
  applicationStatusesForFilter,
  campaignStatusLabel,
  label,
  SIMPLE_APPLICATION_FILTERS,
  simpleApplicationStatus,
} from "@/lib/labels";
import {
  listBusinessCampaignApplications,
} from "@/services/business-application.service";
import { getBusinessCampaign } from "@/services/business-campaign.service";
import { SelectBidButton } from "@/components/business/application-review-actions";
import { CompleteCampaignButton } from "@/components/business/campaign-completion-button";
import type { BusinessApplication } from "@/types/business.types";
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

export const metadata = { title: "Creator bids" };

/** Bids live with the campaign they belong to — no global list. */
export default function CampaignApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; niche?: string; sort?: string }>;
}) {
  return (
    <Suspense fallback={<CampaignApplicationsSkeleton />}>
      <CampaignApplicationsLoader
        params={params}
        searchParams={searchParams}
      />
    </Suspense>
  );
}

async function CampaignApplicationsLoader({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; niche?: string; sort?: string }>;
}) {
  await connection();
  const { id: reference } = await params;
  const { user } = await requireBusiness();
  const [campaign, query] = await Promise.all([
    getBusinessCampaign(user.id, reference),
    searchParams,
  ]);
  if (!campaign) notFound();

  // Old UUID links resolve to the campaign, then move to its short URL.
  if (reference !== campaignSlug(campaign)) {
    redirect(campaignPath(campaign, "applications"));
  }

  const applications = await listBusinessCampaignApplications(
    user.id,
    campaign.id,
  );

  const statusFilter = applicationFilterFromValue(query.status);
  const nicheFilter = nicheFilterFromValue(query.niche);
  const sort = bidSortFromValue(query.sort);
  const matchingStatuses =
    statusFilter === "all" ? [] : applicationStatusesForFilter(statusFilter);

  const statusMatched =
    statusFilter === "all"
      ? applications
      : applications.filter((application) =>
          matchingStatuses.includes(application.status),
        );
  const nicheMatched = filterBidsByNiche(statusMatched, nicheFilter);
  const filtered = sortBids(nicheMatched, sort);
  const nicheOptions = bidNicheOptions(applications);
  const hasFilters =
    statusFilter !== "all" || nicheFilter !== "all" || sort !== "newest";
  const campaignFinished =
    campaign.status === "completed" || campaign.status === "closed";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <Link
        href="/business/campaigns"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" /> All campaigns
      </Link>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {campaign.title}
            </h1>
            <Badge variant={campaignStatusVariant(campaign.status)}>
              {campaignStatusLabel(campaign.status)}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {campaign.category} · {campaign.platforms.join(", ")} · Updated{" "}
            {new Date(campaign.updated_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CompleteCampaignButton
            campaignId={campaign.id}
            finished={campaignFinished}
          />
          <Button variant="outline" size="sm" asChild>
            <Link href={campaignPath(campaign, "edit")}>
              <PencilIcon className="size-4" /> Edit campaign
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={campaignMessagesPath(campaign)}>
              <MessagesSquareIcon className="size-4" /> Message creators
            </Link>
          </Button>
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Creator bids</CardTitle>
          <CardDescription>
            {applications.length === 0
              ? "No creators have applied to this campaign yet."
              : `${applications.length} creator${
                  applications.length === 1 ? "" : "s"
                } quoted a rate. Select the ones you want at their quoted price, then complete the campaign.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length > 0 ? (
            <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
              <div className="grid gap-1">
                <label htmlFor="status" className="text-xs text-muted-foreground">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={statusFilter}
                  className="h-9 rounded-xl border border-input bg-card/80 px-3 text-sm"
                >
                  {SIMPLE_APPLICATION_FILTERS.map((filter) => (
                    <option key={filter.value} value={filter.value}>
                      {filter.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1">
                <label htmlFor="niche" className="text-xs text-muted-foreground">
                  Creator niche
                </label>
                <select
                  id="niche"
                  name="niche"
                  defaultValue={nicheFilter}
                  className="h-9 rounded-xl border border-input bg-card/80 px-3 text-sm"
                >
                  <option value="all">All niches</option>
                  {nicheOptions.map((niche) => (
                    <option key={niche.value} value={niche.value}>
                      {niche.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1">
                <label htmlFor="sort" className="text-xs text-muted-foreground">
                  Sort by rate
                </label>
                <select
                  id="sort"
                  name="sort"
                  defaultValue={sort}
                  className="h-9 rounded-xl border border-input bg-card/80 px-3 text-sm"
                >
                  {BID_SORTS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" size="sm">Filter</Button>
              {hasFilters ? (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={campaignPath(campaign, "applications")}>
                    Clear
                  </Link>
                </Button>
              ) : null}
            </form>
          ) : null}

          {campaignFinished ? (
            <p className="mb-4 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
              This campaign is finished. Creators who applied can see that it
              ended. Reopen it from Edit campaign to select more creators.
            </p>
          ) : null}

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {applications.length === 0
                ? "Share the campaign with creators to start receiving proposals."
                : "No creators match these filters."}
            </p>
          ) : (
            <ul className="divide-y">
              {filtered.map((application) => (
                <ApplicationRow
                  key={application.id}
                  application={application}
                  disabled={campaignFinished}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ApplicationRow({
  application,
  disabled,
}: {
  application: BusinessApplication;
  disabled: boolean;
}) {
  const creatorName =
    application.creator?.full_name ??
    application.creator?.username ??
    "Creator";
  const group = simpleApplicationStatus(application.status);
  const canSelect =
    !disabled && (group === "new" || group === "in_talks");

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Link
          href={`/business/applications/${application.id}`}
          className="font-medium hover:underline"
        >
          {creatorName}
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">
          {application.creator?.username ? `@${application.creator.username} · ` : ""}
          <span className="font-medium text-foreground">
            {formatPrice(application.expected_price, application.currency)}
          </span>{" "}
          · {new Date(application.created_at).toLocaleDateString()}
        </p>
        {(application.creator?.niches ?? []).length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {(application.creator?.niches ?? []).slice(0, 4).map((niche) => (
              <Badge key={niche} variant="secondary" className="text-[10px]">
                {label(niche)}
              </Badge>
            ))}
          </div>
        ) : null}
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {application.proposal}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Badge variant={applicationStatusVariant(application.status)}>
          {applicationStatusLabel(application.status)}
        </Badge>
        {canSelect ? (
          <SelectBidButton applicationId={application.id} />
        ) : group === "selected" ? (
          <Button size="sm" variant="outline" asChild>
            <Link
              href={
                application.campaign
                  ? campaignMessagesPath(application.campaign)
                  : "/business/messages"
              }
            >
              Open chat
            </Link>
          </Button>
        ) : (
          <Button size="sm" variant="outline" asChild>
            <Link href={`/business/applications/${application.id}`}>View</Link>
          </Button>
        )}
      </div>
    </li>
  );
}

function CampaignApplicationsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8" aria-hidden>
      <Skeleton className="h-8 w-72" />
      <Skeleton className="mt-6 h-10 w-96" />
      <Skeleton className="mt-8 h-96" />
    </div>
  );
}
