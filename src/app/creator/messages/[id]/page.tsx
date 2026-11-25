import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { requireCreator } from "@/lib/auth/session";
import {
  getCreatorConversation,
  listMessages,
} from "@/services/message.service";
import { MessageThread } from "../message-thread";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

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
  const { user } = await requireCreator();
  const detail = await getCreatorConversation(user.id, id);
  if (!detail) notFound();

  const messages = await listMessages(id);

  return (
    <ThreadView
      detail={detail}
      messages={messages}
      currentUserId={user.id}
    />
  );
}

function ThreadView({
  detail,
  messages,
  currentUserId,
}: {
  detail: NonNullable<Awaited<ReturnType<typeof getCreatorConversation>>>;
  messages: Awaited<ReturnType<typeof listMessages>>;
  currentUserId: string;
}) {
  const businessName =
    detail.collaboration.business?.company_name ?? "Business";
  const campaignTitle = detail.collaboration.campaign?.title;
  const status = detail.collaboration.status.replace(/_/g, " ");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link
        href="/creator/messages"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
      >
        <ArrowLeftIcon className="size-4" /> Back to messages
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{businessName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {campaignTitle ? `${campaignTitle} · ` : ""}{status}
          </p>
        </div>
        <Badge variant="outline" className="text-xs capitalize">
          {status}
        </Badge>
      </div>

      <MessageThread
        conversationId={detail.conversation.id}
        currentUserId={currentUserId}
        initialMessages={messages}
      />

      <p className="mt-4 text-center text-xs text-muted-foreground">
        <Link
          href={`/creator/collaborations/${detail.collaboration.id}`}
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
