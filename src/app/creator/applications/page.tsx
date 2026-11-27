import { connection } from "next/server";
import { Suspense } from "react";
import { ChevronRightIcon } from "lucide-react";

import { requireCreator } from "@/lib/auth/session";
import { formatMoney } from "@/lib/money";
import {
  APPLICATION_STATUS_HELP,
  applicationStatusLabel,
} from "@/lib/labels";
import { listOwnApplications } from "@/services/campaign.service";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata = { title: "My applications" };

/**
 * My applications page. Lists the signed-in creator's campaign
 * applications with their current status. Streams behind Suspense.
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
            Track your applications and see what to do next.
          </p>
        </div>
        <Link href="/creator/discover">
          <Button variant="outline">
            <ChevronRightIcon className="size-4 shrink-0 mr-2" /> Browse campaigns
          </Button>
        </Link>
      </div>

      <Card className="mt-6">
        <CardContent className="grid gap-2 py-4 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
          <p className="font-medium text-foreground sm:col-span-full">
            What the statuses mean
          </p>
          {Object.entries(APPLICATION_STATUS_HELP).map(([status, help]) => (
            <p key={status}>
              <span className="font-medium text-foreground">
                {applicationStatusLabel(status as keyof typeof APPLICATION_STATUS_HELP)}:
              </span>{" "}
              {help}
            </p>
          ))}
        </CardContent>
      </Card>

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
  const statusConfig: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "outline",
    accepted: "default",
    finalized: "default",
    rejected: "destructive",
    withdrawn: "secondary",
  };

  const badgeVariant = statusConfig[app.status] ?? "secondary";
  const inConversation = app.status === "accepted" || app.status === "finalized";

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 items-center justify-center size-10 rounded-full bg-muted">
              <span className="text-sm font-medium">
                {app.campaign?.title.charAt(0) ?? "C"}
              </span>
            </div>
            <div className="min-w-0">
              <Link
                href={`/creator/campaigns/${app.campaign_id}`}
                className="block truncate text-sm font-medium hover:underline"
              >
                {app.campaign?.title ?? "Campaign"}
              </Link>
              <p className="text-xs text-muted-foreground truncate">
                {app.campaign?.category ?? ""}
                {app.campaign?.application_deadline && (
                  <span className="ml-2">· deadline {new Date(app.campaign.application_deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                )}
              </p>
            </div>
          </div>
          <Badge variant={badgeVariant} className="text-xs">
            {applicationStatusLabel(app.status)}
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="border-t px-4 py-3 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {app.proposal.slice(0, 100)}{app.proposal.length > 100 ? "…" : ""}
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
          <Card key={i} className="h-24 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
