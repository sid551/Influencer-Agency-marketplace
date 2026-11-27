import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ArrowRightIcon, CalendarDaysIcon } from "lucide-react";

import { requireCreator } from "@/lib/auth/session";
import { formatMoney } from "@/lib/money";
import { listOwnCollaborations } from "@/services/collaboration.service";
import type {
  CollaborationListItem,
  CollaborationStatus,
} from "@/types/collaboration.types";
import { OpenConversationButton } from "./collaboration-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export const metadata = { title: "My collaborations" };

/** Collaborations created from the creator's accepted campaign applications. */
export default function CreatorCollaborationsPage() {
  return (
    <Suspense fallback={<CollaborationsSkeleton />}>
      <CollaborationsLoader />
    </Suspense>
  );
}

async function CollaborationsLoader() {
  await connection();
  const { user } = await requireCreator();
  const collaborations = await listOwnCollaborations(user.id);

  return <CollaborationsView collaborations={collaborations} />;
}

const STATUS_BADGES: Record<
  CollaborationStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  negotiating: { label: "Negotiating", variant: "outline" },
  agreement_pending: { label: "Agreement pending", variant: "secondary" },
  active: { label: "Active", variant: "default" },
  submitted: { label: "Submitted", variant: "secondary" },
  revision_requested: { label: "Revision requested", variant: "outline" },
  approved: { label: "Approved", variant: "default" },
  completed: { label: "Completed", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  disputed: { label: "Disputed", variant: "destructive" },
};

function statusBadge(status: CollaborationStatus) {
  const config = STATUS_BADGES[status] ?? {
    label: status,
    variant: "outline" as const,
  };
  return (
    <Badge variant={config.variant} className="text-xs">
      {config.label}
    </Badge>
  );
}

function formatDate(value: string | null) {
  if (!value) return "No deadline";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function CollaborationsView({
  collaborations,
}: {
  collaborations: CollaborationListItem[];
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My collaborations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage active work, agreements, and conversations from businesses.
        </p>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Active and past work</h2>
        {collaborations.length === 0 ? (
          <Card className="mt-3">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              You don&apos;t have any collaborations yet. Apply to a campaign to
              get started.
            </CardContent>
          </Card>
        ) : (
          <div className="mt-3 grid gap-4">
            {collaborations.map((collaboration) => (
              <Card key={collaboration.id}>
                <CardContent className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-medium">
                        {collaboration.campaign?.title ?? "Collaboration"}
                      </p>
                      {statusBadge(collaboration.status)}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {collaboration.business?.company_name ?? "Business"}
                      {collaboration.agreed_price !== null ? (
                        <span>
                          {" · "}
                          {formatMoney(collaboration.agreed_price, collaboration.currency)}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDaysIcon className="size-3.5" />
                      Due {formatDate(collaboration.deadline)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {collaboration.conversation_id ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/creator/messages/${collaboration.conversation_id}`}>
                          Messages
                        </Link>
                      </Button>
                    ) : (
                      <OpenConversationButton collaborationId={collaboration.id} />
                    )}
                    <Button asChild size="sm">
                      <Link href={`/creator/collaborations/${collaboration.id}`}>
                        Manage <ArrowRightIcon className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-3 text-xs text-muted-foreground">
                  {collaboration.deliverables.length > 0
                    ? `${collaboration.deliverables.filter((item) => item.status === "approved").length} of ${collaboration.deliverables.length} deliverables approved`
                    : "No deliverables agreed yet"}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CollaborationsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="h-8 w-56 animate-pulse rounded-xl bg-muted" />
      <div className="mt-8 h-6 w-32 animate-pulse rounded-xl bg-muted" />
      <div className="mt-3 grid gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="h-28 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
