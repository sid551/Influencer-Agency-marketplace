import { connection } from "next/server";
import { Suspense } from "react";
import { ChevronRightIcon } from "lucide-react";

import { requireCreator } from "@/lib/auth/session";
import { formatMoney } from "@/lib/money";
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
            Track your campaign applications and their status.
          </p>
        </div>
        <Link href="/creator/discover">
          <Button variant="outline">
            <ChevronRightIcon className="size-4 shrink-0 mr-2" /> Browse campaigns
          </Button>
        </Link>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">
              You haven&apos;t applied to any campaigns yet. Start browsing to
              find collaborations that fit you.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 grid gap-4">
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
  const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    pending: { variant: "outline", label: "Pending" },
    accepted: { variant: "default", label: "Negotiating" },
    finalized: { variant: "default", label: "Selected" },
    rejected: { variant: "destructive", label: "Rejected" },
    withdrawn: { variant: "secondary", label: "Withdrawn" },
  };

  const config = statusConfig[app.status] ?? {
    variant: "secondary",
    label: app.status,
  };

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
              <p className="text-sm font-medium truncate">
                {app.campaign?.title ?? "Campaign"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {app.campaign?.category ?? ""}
                {app.campaign?.application_deadline && (
                  <span className="ml-2">· deadline {new Date(app.campaign.application_deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                )}
              </p>
            </div>
          </div>
          <Badge variant={config.variant} className="text-xs">
            {config.label}
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="border-t px-4 py-3 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {app.proposal.slice(0, 100)}{app.proposal.length > 100 ? "…" : ""}
        </span>
        <span className="text-muted-foreground">
          {formatMoney(app.expected_price, app.currency)}
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
