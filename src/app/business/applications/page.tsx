import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";

import { requireBusiness } from "@/lib/auth/session";
import {
  applicationStatusVariant,
  formatPrice,
} from "@/lib/business-format";
import { listBusinessApplications } from "@/services/business-application.service";
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
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
} from "@/types/campaign.types";
import type { BusinessApplication } from "@/types/business.types";

export const metadata = { title: "Applications" };

export default function BusinessApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string; status?: string }>;
}) {
  return (
    <Suspense fallback={<ApplicationsSkeleton />}>
      <ApplicationsLoader searchParams={searchParams} />
    </Suspense>
  );
}

async function ApplicationsLoader({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string; status?: string }>;
}) {
  await connection();
  const { user } = await requireBusiness();
  const applications = await listBusinessApplications(user.id);
  const params = await searchParams;
  const campaignFilter = typeof params.campaign === "string" ? params.campaign : "";
  const statusFilter = APPLICATION_STATUSES.includes(
    params.status as ApplicationStatus,
  )
    ? (params.status as ApplicationStatus)
    : "";

  const filtered = applications.filter((application) => {
    if (campaignFilter && application.campaign_id !== campaignFilter) return false;
    if (statusFilter && application.status !== statusFilter) return false;
    return true;
  });

  const campaigns = Array.from(
    new Map(
      applications
        .filter((application) => application.campaign)
        .map((application) => [
          application.campaign!.id,
          { id: application.campaign!.id, title: application.campaign!.title },
        ]),
    ).values(),
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
        <p className="text-sm text-muted-foreground">
          Review proposals from creators who applied to your campaigns.
        </p>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>All applications</CardTitle>
          <CardDescription>
            {filtered.length === 0
              ? "Nothing matches these filters."
              : `${filtered.length} application${filtered.length === 1 ? "" : "s"}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
            <div className="grid gap-1">
              <label htmlFor="campaign" className="text-xs text-muted-foreground">
                Campaign
              </label>
              <select
                id="campaign"
                name="campaign"
                defaultValue={campaignFilter}
                className="h-9 rounded-xl border border-input bg-card/80 px-3 text-sm"
              >
                <option value="">All campaigns</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.title}
                  </option>
                ))}
              </select>
            </div>
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
                <option value="">All statuses</option>
                {APPLICATION_STATUSES.map((status) => (
                  <option key={status} value={status} className="capitalize">
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm">Filter</Button>
            {campaignFilter || statusFilter ? (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/business/applications">Clear</Link>
              </Button>
            ) : null}
          </form>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {applications.length === 0
                ? "No applications yet. Publish a campaign to start receiving them."
                : "Try a different campaign or status."}
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
          {application.campaign?.title ?? "Campaign unavailable"} ·{" "}
          {formatPrice(application.expected_price, application.currency)} ·{" "}
          {new Date(application.created_at).toLocaleDateString()}
        </p>
      </div>
      <Badge
        variant={applicationStatusVariant(application.status)}
        className="w-fit capitalize"
      >
        {application.status}
      </Badge>
    </li>
  );
}

function ApplicationsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8" aria-hidden>
      <Skeleton className="h-8 w-52" />
      <Skeleton className="mt-8 h-96" />
    </div>
  );
}
