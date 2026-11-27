import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { requireBusiness } from "@/lib/auth/session";
import {
  applicationStatusVariant,
  formatPrice,
} from "@/lib/business-format";
import { uuidSchema } from "@/lib/validations/ids";
import { getBusinessApplication } from "@/services/business-application.service";
import { ApplicationReviewActions } from "@/components/business/application-review-actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Application details" };

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-4xl px-4 py-10" aria-hidden>
          <Skeleton className="h-96" />
        </div>
      }
    >
      <ApplicationLoader params={params} />
    </Suspense>
  );
}

async function ApplicationLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const { user } = await requireBusiness();
  const application = await getBusinessApplication(user.id, parsedId.data);
  if (!application) notFound();

  const creatorName =
    application.creator?.full_name ??
    application.creator?.username ??
    "Creator";

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link
        href={
          application.campaign_id
            ? `/business/campaigns/${application.campaign_id}/applications`
            : "/business/campaigns"
        }
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to campaign applications
      </Link>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{creatorName}</h1>
          <p className="text-sm text-muted-foreground">
            Applied to {application.campaign?.title ?? "a campaign"} on{" "}
            {new Date(application.created_at).toLocaleDateString()}
          </p>
        </div>
        <Badge
          variant={applicationStatusVariant(application.status)}
          className="w-fit capitalize"
        >
          {application.status}
        </Badge>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Proposal</CardTitle>
            <CardDescription>What the creator plans to deliver.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <p className="whitespace-pre-wrap text-sm">{application.proposal}</p>
            {application.why_suitable ? (
              <div>
                <p className="text-xs text-muted-foreground">Why they&apos;re a good fit</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">
                  {application.why_suitable}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Expected price</p>
                <p className="font-medium">
                  {formatPrice(application.expected_price, application.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Creator</p>
                <p>
                  {application.creator?.username
                    ? `@${application.creator.username}`
                    : "No handle yet"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p>
                  {[application.creator?.city, application.creator?.state]
                    .filter(Boolean)
                    .join(", ") || "Not set"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Review</CardTitle>
              <CardDescription>
                Accepting opens a negotiation with this creator. Finalize one
                creator after you agree on the work and price.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApplicationReviewActions
                applicationId={application.id}
                status={application.status}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
