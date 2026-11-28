import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { requireBusiness } from "@/lib/auth/session";
import { campaignMessagesPath, campaignSlug } from "@/lib/campaign-paths";
import { collaborationStatusVariant } from "@/lib/business-format";
import {
  collaborationStatusLabel,
  simpleApplicationStatus,
} from "@/lib/labels";
import {
  getBusinessConversation,
  listMessages,
} from "@/services/message.service";
import { MessageThread } from "../message-thread";
import { ThreadContextPanel } from "@/components/messages/thread-context-panel";
import { ApplicationDecisionButton } from "@/components/business/application-review-actions";
import { BusinessCollaborationTermsForm } from "@/components/business/business-collaboration-actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Conversation" };

/** One collaboration thread with server-rendered history + Realtime updates. */
export default function MessageThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<ThreadSkeleton />}>
      <ThreadLoader params={params} />
    </Suspense>
  );
}

async function ThreadLoader({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const { user } = await requireBusiness();
  const detail = await getBusinessConversation(user.id, id);
  if (!detail) notFound();

  const messages = await listMessages(id);
  const campaignRef = detail.collaboration.campaign
    ? campaignSlug(detail.collaboration.campaign)
    : null;

  return (
    <ThreadView
      detail={detail}
      messages={messages}
      currentUserId={user.id}
      campaignRef={campaignRef}
    />
  );
}

function ThreadView({
  detail,
  messages,
  currentUserId,
  campaignRef,
}: {
  detail: NonNullable<Awaited<ReturnType<typeof getBusinessConversation>>>;
  messages: Awaited<ReturnType<typeof listMessages>>;
  currentUserId: string;
  campaignRef: string | null;
}) {
  const creatorName =
    detail.collaboration.creator?.full_name ??
    detail.collaboration.creator?.username ??
    "Creator";
  const campaignTitle = detail.collaboration.campaign?.title;
  const status = collaborationStatusLabel(detail.collaboration.status);
  const canNegotiate = ["negotiating", "agreement_pending"].includes(
    detail.collaboration.status,
  );
  const canFinalize =
    detail.collaboration.applicationId !== null &&
    detail.collaboration.applicationStatus === "accepted";
  const backStatus =
    detail.collaboration.applicationStatus
      ? simpleApplicationStatus(detail.collaboration.applicationStatus)
      : "all";

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link
        href={
          campaignRef
            ? `${campaignMessagesPath({ id: campaignRef })}?status=${backStatus}`
            : "/business/messages"
        }
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
      >
        <ArrowLeftIcon className="size-4" /> Back to campaign messages
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{creatorName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {campaignTitle ? `${campaignTitle} · ` : ""}{status}
          </p>
        </div>
        <Badge
          variant={collaborationStatusVariant(detail.collaboration.status)}
          className="text-xs"
        >
          {status}
        </Badge>
      </div>

      <ThreadContextPanel collaboration={detail.collaboration} />

      {canNegotiate ? (
        <div className="mt-6">
          <BusinessCollaborationTermsForm
            collaborationId={detail.collaboration.id}
            terms={detail.collaboration.terms}
            agreedPrice={detail.collaboration.agreed_price}
            currency={detail.collaboration.currency}
            deadline={detail.collaboration.deadline}
          />
        </div>
      ) : null}

      {canFinalize ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Finish the selection</CardTitle>
            <CardDescription>
              Finalizing agrees the price and selects this creator. Other
              creators stay available for this campaign.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <ApplicationDecisionButton
              applicationId={detail.collaboration.applicationId!}
              decision="finalized"
              size="default"
            />
            <ApplicationDecisionButton
              applicationId={detail.collaboration.applicationId!}
              decision="rejected"
            />
          </CardContent>
        </Card>
      ) : null}

      <MessageThread
        conversationId={detail.conversation.id}
        currentUserId={currentUserId}
        initialMessages={messages}
      />

      <p className="mt-4 text-center text-xs text-muted-foreground">
        <Link
          href={`/business/collaborations/${detail.collaboration.id}`}
          className="hover:text-foreground hover:underline"
        >
          View collaboration details
        </Link>
      </p>
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-6 h-8 w-48 animate-pulse rounded bg-muted" />
      <Card className="mt-6 h-[min(70vh,640px)] animate-pulse" />
    </div>
  );
}
