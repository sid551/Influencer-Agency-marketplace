import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { MessageSquareIcon } from "lucide-react";

import { requireBusiness } from "@/lib/auth/session";
import { campaignStatusVariant } from "@/lib/business-format";
import { campaignStatusLabel } from "@/lib/labels";
import { listBusinessMessageCampaigns } from "@/services/message.service";
import type { BusinessMessageCampaign } from "@/types/business.types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Messages" };

/** Campaign-wise inbox: pick a campaign, then message its accepted creators. */
export default function BusinessMessagesPage() {
  return (
    <Suspense fallback={<MessagesSkeleton />}>
      <MessagesLoader />
    </Suspense>
  );
}

async function MessagesLoader() {
  await connection();
  const { user } = await requireBusiness();
  const campaigns = await listBusinessMessageCampaigns(user.id);
  return <MessagesView campaigns={campaigns} />;
}

function formatActivity(value: string | null) {
  if (!value) return "No activity";
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

function MessagesView({ campaigns }: { campaigns: BusinessMessageCampaign[] }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a campaign to see the creators you&apos;re working with.
        </p>
      </div>

      {campaigns.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <MessageSquareIcon className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No campaigns yet. Create a campaign and accept an application to
              start messaging creators.
            </p>
            <Link
              href="/business/campaigns/new"
              className="text-sm text-primary hover:underline"
            >
              New campaign
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 grid gap-3">
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/business/messages/campaigns/${campaign.id}`}
              className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <MessageSquareIcon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{campaign.title}</p>
                      <Badge
                        variant={campaignStatusVariant(campaign.status)}
                        className="text-xs"
                      >
                        {campaignStatusLabel(campaign.status)}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {campaign.applicationCount} application
                      {campaign.applicationCount === 1 ? "" : "s"} ·{" "}
                      {campaign.acceptedCount} creator
                      {campaign.acceptedCount === 1 ? "" : "s"} in talks
                    </p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {campaign.lastMessage?.body ?? "No messages yet."}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatActivity(campaign.lastActivityAt)}
                    </span>
                    {campaign.unreadCount > 0 ? (
                      <Badge className="text-xs">{campaign.unreadCount}</Badge>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
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
          <Card key={index} className="h-24 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
