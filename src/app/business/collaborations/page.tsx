import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ArrowRightIcon } from "lucide-react";

import { requireBusiness } from "@/lib/auth/session";
import {
  collaborationStatusVariant,
  formatDate,
  formatPrice,
} from "@/lib/business-format";
import { listBusinessCollaborations } from "@/services/business-collaboration.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CollaborationStatus } from "@/types/collaboration.types";
import type { BusinessCollaboration } from "@/types/business.types";

export const metadata = { title: "Business collaborations" };

/** Only collaborations finalized by both parties appear here. */
const LISTED_STATUSES: CollaborationStatus[] = [
  "active",
  "submitted",
  "revision_requested",
  "approved",
  "completed",
  "disputed",
];

/** Finalized collaborations — negotiations stay in Messages until selected. */
export default function BusinessCollaborationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  return (
    <Suspense fallback={<CollaborationsSkeleton />}>
      <CollaborationsLoader searchParams={searchParams} />
    </Suspense>
  );
}

async function CollaborationsLoader({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await connection();
  const { user } = await requireBusiness();
  const collaborations = await listBusinessCollaborations(user.id);
  const params = await searchParams;
  const statusFilter = LISTED_STATUSES.includes(
    params.status as CollaborationStatus,
  )
    ? (params.status as CollaborationStatus)
    : "";
  const filtered = statusFilter
    ? collaborations.filter((collaboration) => collaboration.status === statusFilter)
    : collaborations;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Collaborations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Finalized work only — review submitted work and close out paid
          projects. Open negotiations stay in Messages.
        </p>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Finalized collaborations</CardTitle>
          <CardDescription>
            {filtered.length === 0
              ? "Nothing matches these filters."
              : `${filtered.length} collaboration${filtered.length === 1 ? "" : "s"}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                <option value="">All statuses</option>
                {LISTED_STATUSES.map((status) => (
                  <option key={status} value={status} className="capitalize">
                    {status.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm">
              Filter
            </Button>
            {statusFilter ? (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/business/collaborations">Clear</Link>
              </Button>
            ) : null}
          </form>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {collaborations.length === 0
                ? "No finalized collaborations yet. Finalize a creator from a campaign's applications."
                : "Try a different status."}
            </p>
          ) : (
            <ul className="divide-y">
              {filtered.map((collaboration) => (
                <CollaborationRow
                  key={collaboration.id}
                  collaboration={collaboration}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CollaborationRow({
  collaboration,
}: {
  collaboration: BusinessCollaboration;
}) {
  const creatorName =
    collaboration.creator?.full_name ??
    collaboration.creator?.username ??
    "Creator";
  const approved = collaboration.deliverables.filter(
    (item) => item.status === "approved",
  ).length;

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Link
          href={`/business/collaborations/${collaboration.id}`}
          className="font-medium hover:underline"
        >
          {collaboration.campaign?.title ?? "Collaboration"}
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">
          with {creatorName} ·{" "}
          {collaboration.agreed_price !== null
            ? formatPrice(collaboration.agreed_price, collaboration.currency)
            : "Price not agreed"}{" "}
          · {formatDate(collaboration.deadline)}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Badge
          variant={collaborationStatusVariant(collaboration.status)}
          className="capitalize"
        >
          {collaboration.status.replace(/_/g, " ")}
        </Badge>
        <Button asChild size="sm" variant="outline">
          <Link href={`/business/collaborations/${collaboration.id}`}>
            Manage <ArrowRightIcon className="size-4" />
          </Link>
        </Button>
      </div>
      <CardFooter className="border-t p-0 pt-3 text-xs text-muted-foreground">
        {collaboration.deliverables.length > 0
          ? `${approved} of ${collaboration.deliverables.length} deliverables approved`
          : "No deliverables agreed yet"}
      </CardFooter>
    </li>
  );
}

function CollaborationsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8" aria-hidden>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-8 h-96" />
    </div>
  );
}
