import { connection } from "next/server";
import { Suspense } from "react";
import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { requireCreator } from "@/lib/auth/session";
import { creatorCampaignPath } from "@/lib/campaign-paths";
import {
  applicationStatusVariant,
  campaignStatusVariant,
} from "@/lib/business-format";
import { formatMoney } from "@/lib/money";
import {
  SIMPLE_APPLICATION_STATUS_HELP,
  applicationStatusLabel,
  campaignStatusLabel,
  simpleApplicationStatus,
  simpleCampaignStatus,
} from "@/lib/labels";
import { listOwnApplications } from "@/services/campaign.service";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "My applications" };

/**
 * My applications page. Lists the signed-in creator's campaign
 * applications with a short next step instead of a status glossary.
 */
export default function CreatorApplicationsPage() {
  return (
    <Suspense fallback={<ApplicationsSkeleton />}>
      <ApplicationsLoader />
    </Suspense>
  );
}

async function ApplicationsLoader() {
  await connection();
  const { user } = await requireCreator();
  const applications = await listOwnApplications(user.id);

  return <ApplicationsView applications={applications} />;
}

function ApplicationsView({
  applications,
}: {
  applications: Awaited<ReturnType<typeof listOwnApplications>>;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            My applications
          </h1>
          <p className="text-sm text-muted-foreground">
            See what needs your attention, all in one place.
          </p>
        </div>
        <Link href="/creator/discover">
          <Button variant="outline">
            <ChevronRightIcon className="mr-2 size-4 shrink-0" /> Browse campaigns
          </Button>
        </Link>
      </div>

      {applications.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">
              You haven&apos;t applied to any campaigns yet. Start browsing to
              find collaborations that fit you.
            </p>
            <Link href="/creator/discover">
              <Button className="mt-5">Browse campaigns</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4">
          {applications.map((app) => (
            <ApplicationCard key={app.id} app={app} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicationCard({
  app,
}: {
  app: Awaited<ReturnType<typeof listOwnApplications>>[number];
}) {
  const group = simpleApplicationStatus(app.status);
  const campaignGroup = app.campaign
    ? simpleCampaignStatus(app.campaign.status)
    : null;
  const inConversation = group === "in_talks" || group === "selected";

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <span className="text-sm font-medium">
                {app.campaign?.title.charAt(0) ?? "C"}
              </span>
            </div>
            <div className="min-w-0">
              <Link
                href={
                  app.campaign
                    ? creatorCampaignPath(app.campaign)
                    : `/creator/campaigns/${app.campaign_id}`
                }
                className="block truncate text-sm font-medium hover:underline"
              >
                {app.campaign?.title ?? "Campaign"}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                {app.campaign?.category ?? ""}
                {app.campaign?.application_deadline ? (
                  <span className="ml-2">
                    · deadline{" "}
                    {new Date(app.campaign.application_deadline).toLocaleDateString(
                      undefined,
                      { month: "short", day: "numeric" },
                    )}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {app.campaign ? (
              <Badge
                variant={campaignStatusVariant(app.campaign.status)}
                className="text-xs"
              >
                {campaignStatusLabel(app.campaign.status)}
              </Badge>
            ) : null}
            <Badge variant={applicationStatusVariant(app.status)} className="text-xs">
              {applicationStatusLabel(app.status)}
            </Badge>
          </div>
        </div>
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">
          {SIMPLE_APPLICATION_STATUS_HELP[group]}
        </p>
        {campaignGroup === "done" ? (
          <p className="border-t px-4 py-2 text-xs text-muted-foreground">
            This campaign has ended. Your application stays here as a record.
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t px-4 py-3 text-xs">
        <span className="truncate text-muted-foreground">
          {app.proposal.slice(0, 100)}
          {app.proposal.length > 100 ? "…" : ""}
        </span>
        <span className="flex items-center gap-3">
          <span className="text-muted-foreground">
            {formatMoney(app.expected_price, app.currency)}
          </span>
          {inConversation ? (
            <Link
              href="/creator/messages"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Open messages →
            </Link>
          ) : null}
        </span>
      </CardFooter>
    </Card>
  );
}

function ApplicationsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="h-8 w-32 animate-pulse rounded-xl bg-muted" />
      <div className="mt-8 grid gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="h-24 animate-pulse rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
