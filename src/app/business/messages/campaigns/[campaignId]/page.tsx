import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon, MessageSquareIcon } from "lucide-react";

import { requireBusiness } from "@/lib/auth/session";
import {
  campaignMessagesPath,
  campaignPath,
  campaignSlug,
} from "@/lib/campaign-paths";
import { applicationStatusVariant, formatDate } from "@/lib/business-format";
import { formatMoney } from "@/lib/money";
import {
  applicationConversationFilterFromValue,
  applicationStatusLabel,
  SIMPLE_APPLICATION_FILTERS,
} from "@/lib/labels";
import {
  getBusinessCampaign,
} from "@/services/business-campaign.service";
import {
  listCampaignApplicantConversations,
} from "@/services/message.service";
import type {
  BusinessCampaignApplicantThread,
} from "@/types/business.types";
import {
  MESSAGEABLE_APPLICATION_STATUSES,
  type ApplicationStatus,
} from "@/types/campaign.types";
import {
  openApplicationConversationAction,
} from "../../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Campaign messages" };

/** Creators for one campaign, with a thread for each accepted applicant. */
export default function CampaignMessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ campaignId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  return (
    <Suspense fallback={<CampaignMessagesSkeleton />}>
      <CampaignMessagesLoader params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function CampaignMessagesLoader({
  params,
  searchParams,
}: {
  params: Promise<{ campaignId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  await connection();
  const { campaignId: reference } = await params;
  const query = await searchParams;
  const { user } = await requireBusiness();
  const campaign = await getBusinessCampaign(user.id, reference);
  if (!campaign) notFound();

  // Keep shared UUID bookmarks working without leaving them in the address bar.
  if (reference !== campaignSlug(campaign)) {
    redirect(campaignMessagesPath(campaign));
  }

  const status = applicationConversationFilterFromValue(query.status);
  const applicants = await listCampaignApplicantConversations(
    user.id,
    campaign.id,
    status,
  );

  return (
    <CampaignMessagesView
      campaignRef={campaignSlug(campaign)}
      campaignTitle={campaign.title}
      applicants={applicants}
      status={status}
    />
  );
}

const FILTERS = SIMPLE_APPLICATION_FILTERS.filter(
  (filter) => filter.value !== "closed",
);

function CampaignMessagesView({
  campaignRef,
  campaignTitle,
  applicants,
  status,
}: {
  campaignRef: string;
  campaignTitle: string;
  applicants: BusinessCampaignApplicantThread[];
  status: ApplicationStatus | "all";
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link
        href="/business/messages"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
      >
        <ArrowLeftIcon className="size-4" /> All campaigns
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{campaignTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Creators who applied to this campaign. Open a conversation when you
          are ready to work together.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Button
            key={filter.value}
            asChild
            size="sm"
            variant={filter.value === status ? "default" : "outline"}
          >
            <Link
              href={`${campaignMessagesPath({ id: campaignRef })}?status=${filter.value}`}
            >
              {filter.label}
            </Link>
          </Button>
        ))}
      </div>

      {applicants.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted-foreground">
            <p>
              {status === "accepted"
                ? "No creators are in talks for this campaign yet."
                : status === "pending"
                  ? "No new applications are waiting for review."
                  : status === "finalized"
                    ? "No creators have been selected yet."
                    : "No applicants in this group."}
            </p>
            <Button asChild variant="outline" size="sm">
              <Link
                href={campaignPath({ id: campaignRef }, "applications")}
              >
                Review applications
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-3">
          {applicants.map((applicant) => {
            const creatorName =
              applicant.creator?.full_name ??
              applicant.creator?.username ??
              "Creator";
            return (
              <Card key={applicant.applicationId}>
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <span className="text-sm font-medium">{creatorName.charAt(0)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{creatorName}</p>
                      <Badge
                        variant={applicationStatusVariant(applicant.applicationStatus)}
                        className="text-xs"
                      >
                        {applicationStatusLabel(applicant.applicationStatus)}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatMoney(applicant.expectedPrice, applicant.currency)} · Applied{" "}
                      {formatDate(applicant.appliedAt)}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {applicant.lastMessage?.body ?? applicant.proposal}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {applicant.unreadCount > 0 ? (
                      <Badge className="text-xs">{applicant.unreadCount}</Badge>
                    ) : null}
                    {applicant.conversationId ? (
                      <Button asChild size="sm">
                        <Link href={`/business/messages/${applicant.conversationId}`}>
                          <MessageSquareIcon className="size-4" />
                          Open chat
                        </Link>
                      </Button>
                    ) : MESSAGEABLE_APPLICATION_STATUSES.includes(
                        applicant.applicationStatus as (typeof MESSAGEABLE_APPLICATION_STATUSES)[number],
                      ) ? (
                      <form
                        action={openApplicationConversationAction.bind(
                          null,
                          applicant.applicationId,
                          applicant.campaignId,
                        )}
                      >
                        <Button type="submit" size="sm">
                          <MessageSquareIcon className="size-4" />
                          Message creator
                        </Button>
                      </form>
                    ) : (
                      <Button asChild variant="outline" size="sm">
                        <Link
                          href={`/business/applications/${applicant.applicationId}`}
                        >
                          Review application
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CampaignMessagesSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="h-4 w-28 animate-pulse rounded bg-muted" />
      <div className="mt-6 h-8 w-64 animate-pulse rounded-xl bg-muted" />
      <div className="mt-6 grid gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="h-24 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
