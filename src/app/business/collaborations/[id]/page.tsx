import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, CalendarDaysIcon } from "lucide-react";

import { requireBusiness } from "@/lib/auth/session";
import {
  collaborationStatusVariant,
  formatDate,
  formatPrice,
} from "@/lib/business-format";
import { uuidSchema } from "@/lib/validations/ids";
import { getBusinessCollaboration } from "@/services/business-collaboration.service";
import {
  ApproveDeliverableButton,
  BusinessCollaborationStatusActions,
  BusinessCollaborationTermsForm,
} from "@/components/business/business-collaboration-actions";
import { BusinessDeliverablesEditor } from "@/components/business/business-deliverables-editor";
import { OpenConversationButton } from "@/components/business/open-conversation-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BusinessCollaboration } from "@/types/business.types";
import type { Deliverable } from "@/types/collaboration.types";

export const metadata = { title: "Collaboration details" };

export default function BusinessCollaborationDetailPage({
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
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const { user } = await requireBusiness();
  const collaboration = await getBusinessCollaboration(user.id, parsedId.data);
  if (!collaboration) notFound();

  return <DetailView collaboration={collaboration} />;
}

function DetailView({ collaboration }: { collaboration: BusinessCollaboration }) {
  const canEdit =
    collaboration.status === "negotiating" ||
    collaboration.status === "agreement_pending";
  const canReview =
    collaboration.status === "submitted" ||
    collaboration.status === "revision_requested";
  const allDeliverablesApproved = collaboration.deliverables.every(
    (item) => item.status === "approved",
  );
  const creatorName =
    collaboration.creator?.full_name ??
    collaboration.creator?.username ??
    "Creator";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <Link
        href="/business/collaborations"
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
                <Badge
                  variant={collaborationStatusVariant(collaboration.status)}
                  className="capitalize"
                >
                  {collaboration.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <CardDescription>with {creatorName}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
              <Detail
                label="Agreed price"
                value={
                  collaboration.agreed_price !== null
                    ? formatPrice(
                        collaboration.agreed_price,
                        collaboration.currency,
                      )
                    : "Not agreed yet"
                }
              />
              <Detail label="Deadline" value={formatDate(collaboration.deadline)} />
              <Detail
                label="Submitted"
                value={formatDate(collaboration.submitted_at)}
              />
              <Detail
                label="Completed"
                value={formatDate(collaboration.completed_at)}
              />
              {collaboration.revision_notes ? (
                <div className="sm:col-span-2">
                  <Detail
                    label="Revision notes"
                    value={collaboration.revision_notes}
                  />
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <Detail
                  label="Terms"
                  value={collaboration.terms ?? "No terms recorded yet."}
                />
              </div>
            </CardContent>
          </Card>

          {canEdit ? (
            <BusinessDeliverablesEditor
              collaborationId={collaboration.id}
              deliverables={collaboration.deliverables}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Deliverables</CardTitle>
                <CardDescription>
                  {collaboration.deliverables.length === 0
                    ? "No deliverables were agreed for this collaboration."
                    : canReview
                      ? "Approve each submitted item, then approve the collaboration."
                      : "Review the agreed scope and submitted assets."}
                </CardDescription>
              </CardHeader>
              {collaboration.deliverables.length > 0 ? (
                <CardContent className="grid gap-3">
                  {collaboration.deliverables.map((deliverable) => (
                    <DeliverableRow
                      key={deliverable.id}
                      deliverable={deliverable}
                      collaborationId={collaboration.id}
                      canReview={canReview}
                    />
                  ))}
                </CardContent>
              ) : null}
            </Card>
          )}

          {canEdit ? (
            <BusinessCollaborationTermsForm
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
                Only transitions allowed for businesses are shown.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {collaboration.status === "submitted" &&
              !allDeliverablesApproved ? (
                <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
                  Approve every submitted deliverable to unlock collaboration
                  approval.
                </p>
              ) : null}
              <BusinessCollaborationStatusActions
                collaborationId={collaboration.id}
                status={collaboration.status}
                canApprove={allDeliverablesApproved}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Collaboration details</CardTitle>
              <CardDescription>Who is involved and when it started.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Creator</p>
                <p className="font-medium">{creatorName}</p>
                {collaboration.creator?.username ? (
                  <p className="text-xs text-muted-foreground">
                    @{collaboration.creator.username}
                  </p>
                ) : null}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Campaign</p>
                <p>{collaboration.campaign?.title ?? "No linked campaign"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Started</p>
                <p>{formatDate(collaboration.created_at)}</p>
              </div>
              {collaboration.conversationId ? (
                <Button variant="outline" size="sm" asChild className="mt-2">
                  <Link
                    href={`/business/messages/${collaboration.conversationId}`}
                  >
                    Open conversation
                  </Link>
                </Button>
              ) : (
                <OpenConversationButton collaborationId={collaboration.id} />
              )}
              <Button variant="outline" size="sm" asChild className="mt-2">
                <Link href="/business/messages">View messages</Link>
              </Button>
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
  canReview,
}: {
  deliverable: Deliverable;
  collaborationId: string;
  canReview: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{deliverable.title}</p>
        <Badge
          variant={deliverable.status === "approved" ? "default" : "outline"}
          className="text-xs capitalize"
        >
          {deliverable.status}
        </Badge>
      </div>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <CalendarDaysIcon className="size-3.5" />
        {deliverable.due_date
          ? `Due ${formatDate(deliverable.due_date)}`
          : "No due date"}
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
      {canReview && deliverable.status === "submitted" ? (
        <div className="mt-3">
          <ApproveDeliverableButton
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
    <div className="mx-auto w-full max-w-5xl px-4 py-8" aria-hidden>
      <div className="h-4 w-44 animate-pulse rounded bg-muted" />
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Card className="h-64 animate-pulse" />
          <Card className="h-48 animate-pulse" />
        </div>
        <div className="space-y-6 lg:col-span-4">
          <Card className="h-44 animate-pulse" />
          <Card className="h-52 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
