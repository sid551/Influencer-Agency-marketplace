import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, MessagesSquareIcon, PencilIcon } from "lucide-react";

import { requireBusiness } from "@/lib/auth/session";
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
  SIMPLE_APPLICATION_FILTERS,
  simpleApplicationStatus,
} from "@/lib/labels";
import { uuidSchema } from "@/lib/validations/ids";
import {
  listBusinessCampaignApplications,
} from "@/services/business-application.service";
import { getBusinessCampaign } from "@/services/business-campaign.service";
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

export const metadata = { title: "Campaign applications" };

/** Applications live with the campaign they belong to — no global list. */
export default function CampaignApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
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
  searchParams: Promise<{ status?: string }>;
}) {
  await connection();
  const { id } = await params;
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const { user } = await requireBusiness();
  const [campaign, applications, query] = await Promise.all([
    getBusinessCampaign(user.id, parsedId.data),
    listBusinessCampaignApplications(user.id, parsedId.data),
    searchParams,
  ]);
  if (!campaign) notFound();

  const statusFilter = applicationFilterFromValue(query.status);
  const matchingStatuses =
    statusFilter === "all" ? [] : applicationStatusesForFilter(statusFilter);
  const filtered =
    statusFilter === "all"
      ? applications
      : applications.filter((application) =>
          matchingStatuses.includes(application.status),
        );

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
          <Button variant="outline" size="sm" asChild>
            <Link href={`/business/campaigns/${campaign.id}/edit`}>
              <PencilIcon className="size-4" /> Edit campaign
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/business/messages/campaigns/${campaign.id}`}>
              <MessagesSquareIcon className="size-4" /> Message creators
            </Link>
          </Button>
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>
            {applications.length === 0
              ? "No creators have applied to this campaign yet."
              : `${applications.length} application${
                  applications.length === 1 ? "" : "s"
                } for this campaign.`}
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
              <Button type="submit" size="sm">Filter</Button>
              {statusFilter !== "all" ? (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/business/campaigns/${campaign.id}/applications`}>
                    Clear
                  </Link>
                </Button>
              ) : null}
            </form>
          ) : null}

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {applications.length === 0
                ? "Share the campaign with creators to start receiving proposals."
                : "No applications match this status."}
            </p>
          ) : (
            <ul className="divide-y">
              {filtered.map((application) => (
                <ApplicationRow key={application.id} application={application} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ApplicationRow({ application }: { application: BusinessApplication }) {
  const creatorName =
    application.creator?.full_name ??
    application.creator?.username ??
    "Creator";
  const group = simpleApplicationStatus(application.status);
  const inConversation = group === "in_talks" || group === "selected";

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
          {formatPrice(application.expected_price, application.currency)} ·{" "}
          {new Date(application.created_at).toLocaleDateString()}
        </p>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {application.proposal}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Badge variant={applicationStatusVariant(application.status)}>
          {applicationStatusLabel(application.status)}
        </Badge>
        <Button size="sm" variant={group === "closed" ? "outline" : "default"} asChild>
          <Link
            href={
              inConversation
                ? `/business/messages/campaigns/${application.campaign_id}`
                : `/business/applications/${application.id}`
            }
          >
            {inConversation ? "Open chat" : group === "new" ? "Review" : "View"}
          </Link>
        </Button>
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
