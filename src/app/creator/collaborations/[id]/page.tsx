import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, CalendarDaysIcon, MessageSquareIcon } from "lucide-react";

import { requireCreator } from "@/lib/auth/session";
import { formatMoney } from "@/lib/money";
import { COLLABORATION_STATUS_HELP, label } from "@/lib/labels";
import { getCollaborationForCreator } from "@/services/collaboration.service";
import type {
  CollaborationDetail,
  CollaborationStatus,
  Deliverable,
} from "@/types/collaboration.types";
import {
  CollaborationStatusActions,
  CollaborationTermsForm,
  CreatorDeclineButton,
  DeliverableSubmitForm,
  OpenConversationButton,
} from "../collaboration-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Collaboration details" };

/** Manage a single collaboration: terms, deliverables and status. */
export default function CollaborationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <DetailLoader params={params} />
    </Suspense>
  );
}

async function DetailLoader({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const { user } = await requireCreator();
  const collaboration = await getCollaborationForCreator(user.id, id);
  if (!collaboration) notFound();

  return <DetailView collaboration={collaboration} />;
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

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function DetailView({ collaboration }: { collaboration: CollaborationDetail }) {
  const badge = STATUS_BADGES[collaboration.status] ?? {
    label: collaboration.status,
    variant: "outline" as const,
  };
  const canEditTerms =
    collaboration.status === "negotiating" ||
    collaboration.status === "agreement_pending";
  const canSubmitDeliverables = ["active", "revision_requested", "submitted"].includes(
    collaboration.status,
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <Link
        href="/creator/collaborations"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
      >
        <ArrowLeftIcon className="size-4" /> Back to collaborations
      </Link>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>
                  {collaboration.campaign?.title ?? "Collaboration"}
                </CardTitle>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
              <CardDescription>
                with {collaboration.business?.company_name ?? "a business"}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
              <Detail label="Agreed price" value={collaboration.agreed_price !== null ? formatMoney(collaboration.agreed_price, collaboration.currency) : "Not agreed yet"} />
              <Detail label="Deadline" value={formatDate(collaboration.deadline)} />
              <Detail label="Submitted" value={collaboration.submitted_at ? formatDate(collaboration.submitted_at) : "Not submitted"} />
              <Detail label="Completed" value={collaboration.completed_at ? formatDate(collaboration.completed_at) : "Not completed"} />
              {collaboration.revision_notes ? (
                <div className="sm:col-span-2">
                  <Detail label="Revision notes" value={collaboration.revision_notes} />
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <Detail label="Terms" value={collaboration.terms ?? "No terms recorded yet."} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deliverables</CardTitle>
              <CardDescription>
                {collaboration.deliverables.length > 0
                  ? "Link each asset and submit it for the business to review."
                  : "No deliverables were agreed for this collaboration."}
              </CardDescription>
            </CardHeader>
            {collaboration.deliverables.length > 0 ? (
              <CardContent className="grid gap-3">
                {collaboration.deliverables.map((deliverable) => (
                  <DeliverableRow
                    key={deliverable.id}
                    deliverable={deliverable}
                    collaborationId={collaboration.id}
                    canSubmit={canSubmitDeliverables}
                  />
                ))}
              </CardContent>
            ) : null}
          </Card>

          {canEditTerms ? (
            <CollaborationTermsForm
              collaborationId={collaboration.id}
              terms={collaboration.terms}
              agreedPrice={collaboration.agreed_price}
              currency={collaboration.currency}
              deadline={collaboration.deadline}
            />
          ) : null}
        </div>

        <div className="space-y-6 lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Next steps</CardTitle>
              <CardDescription>
                {COLLABORATION_STATUS_HELP[collaboration.status]}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                <CollaborationStatusActions
                  collaborationId={collaboration.id}
                  status={collaboration.status}
                />
                {canEditTerms ? (
                  <CreatorDeclineButton collaborationId={collaboration.id} />
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquareIcon className="size-4" /> Messages
              </CardTitle>
              <CardDescription>
                Keep all collaboration details in one thread.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {collaboration.conversationId ? (
                <Button asChild className="w-full">
                  <Link href={`/creator/messages/${collaboration.conversationId}`}>
                    Open conversation
                  </Link>
                </Button>
              ) : (
                <OpenConversationButton collaborationId={collaboration.id} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="font-medium">{label}</span>
      <span className="whitespace-pre-wrap text-muted-foreground">{value}</span>
    </div>
  );
}

function DeliverableRow({
  deliverable,
  collaborationId,
  canSubmit,
}: {
  deliverable: Deliverable;
  collaborationId: string;
  canSubmit: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{deliverable.title}</p>
        <Badge variant={deliverable.status === "approved" ? "default" : "outline"} className="text-xs">
          {label(deliverable.status)}
        </Badge>
      </div>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <CalendarDaysIcon className="size-3.5" />
        {deliverable.due_date ? `Due ${formatDate(deliverable.due_date)}` : "No due date"}
      </p>
      {deliverable.asset_url ? (
        <a
          href={deliverable.asset_url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block truncate text-xs text-primary hover:underline"
        >
          {deliverable.asset_url}
        </a>
      ) : null}
      {canSubmit && deliverable.status !== "approved" ? (
        <div className="mt-3">
          <DeliverableSubmitForm
            collaborationId={collaborationId}
            deliverableId={deliverable.id}
          />
        </div>
      ) : null}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Card className="h-64 animate-pulse" />
          <Card className="h-48 animate-pulse" />
        </div>
        <div className="space-y-6 lg:col-span-4">
          <Card className="h-44 animate-pulse" />
          <Card className="h-36 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
