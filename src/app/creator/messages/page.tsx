import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { MessageSquareIcon } from "lucide-react";

import { requireCreator } from "@/lib/auth/session";
import { listCreatorConversations } from "@/services/message.service";
import { dealLabel } from "@/lib/deal";
import type { ConversationListItem } from "@/types/collaboration.types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Messages" };

/** Inbox of collaboration threads, sorted by most recent activity. */
export default function CreatorMessagesPage() {
  return (
    <Suspense fallback={<MessagesSkeleton />}>
      <MessagesLoader />
    </Suspense>
  );
}

async function MessagesLoader() {
  await connection();
  const { user } = await requireCreator();
  const conversations = await listCreatorConversations(user.id);
  return <MessagesView conversations={conversations} />;
}

function formatActivity(value: string) {
  const date = new Date(value);
  const today = new Date();
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function MessagesView({
  conversations,
}: {
  conversations: ConversationListItem[];
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conversations with the businesses you collaborate with.
        </p>
      </div>

      {conversations.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <MessageSquareIcon className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No conversations yet. Open a collaboration to message the business.
            </p>
            <Link
              href="/creator/collaborations"
              className="text-sm text-primary hover:underline"
            >
              View collaborations
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 grid gap-3">
          {conversations.map((conversation) => {
            const title =
              conversation.collaboration?.business?.company_name ?? "Business";
            const campaign = conversation.collaboration?.campaign?.title;
            const deal = conversation.collaboration
              ? dealLabel(conversation.collaboration)
              : null;
            return (
              <Link
                key={conversation.id}
                href={`/creator/messages/${conversation.id}`}
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                      <span className="text-sm font-medium">{title.charAt(0)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{title}</p>
                        {campaign ? (
                          <span className="truncate text-xs text-muted-foreground">
                            · {campaign}
                          </span>
                        ) : null}
                      </div>
                      {deal ? (
                        <p className="mt-0.5 text-xs font-medium text-primary">
                          {deal}
                        </p>
                      ) : null}
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {conversation.lastMessage?.body ?? "No messages yet."}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatActivity(conversation.updated_at)}
                      </span>
                      {conversation.unreadCount > 0 ? (
                        <Badge className="text-xs">{conversation.unreadCount}</Badge>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MessagesSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="h-8 w-32 animate-pulse rounded-xl bg-muted" />
      <div className="mt-8 grid gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="h-20 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
