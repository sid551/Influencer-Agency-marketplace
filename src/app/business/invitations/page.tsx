import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { PlusIcon } from "lucide-react";

import { requireBusiness } from "@/lib/auth/session";
import { listBusinessInvitations } from "@/services/business-invitation.service";
import { CancelInvitationButton } from "@/components/business/cancel-invitation-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  CollaborationRequestStatus,
} from "@/types/campaign.types";
import type { BusinessInvitation } from "@/types/business.types";

export const metadata = { title: "Invitations" };

export default function BusinessInvitationsPage() {
  return (
    <Suspense fallback={<InvitationsSkeleton />}>
      <InvitationsLoader />
    </Suspense>
  );
}

async function InvitationsLoader() {
  await connection();
  const { user } = await requireBusiness();
  const invitations = await listBusinessInvitations(user.id);
  const pendingCount = invitations.filter(
    (invitation) => invitation.status === "pending",
  ).length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invitations</h1>
          <p className="text-sm text-muted-foreground">
            Creators you&apos;ve invited to collaborate. {pendingCount} awaiting a response.
          </p>
        </div>
        <Button asChild>
          <Link href="/business/invitations/new">
            <PlusIcon />
            Invite creator
          </Link>
        </Button>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>All invitations</CardTitle>
          <CardDescription>
            {invitations.length === 0
              ? "You haven't invited any creators yet."
              : `${invitations.length} invitation${invitations.length === 1 ? "" : "s"} sent.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Use “Invite creator” to reach out to someone from the creator directory.
            </p>
          ) : (
            <ul className="divide-y">
              {invitations.map((invitation) => (
                <InvitationRow key={invitation.id} invitation={invitation} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InvitationRow({ invitation }: { invitation: BusinessInvitation }) {
  const creatorName =
    invitation.creator?.full_name ??
    invitation.creator?.username ??
    "Creator";

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium">{creatorName}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {invitation.campaign?.title ?? "No specific campaign"} · Sent{" "}
          {new Date(invitation.created_at).toLocaleDateString()}
        </p>
        {invitation.message ? (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {invitation.message}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge
          variant={invitationStatusVariant(invitation.status)}
          className="capitalize"
        >
          {invitation.status}
        </Badge>
        {invitation.status === "pending" ? (
          <CancelInvitationButton requestId={invitation.id} />
        ) : null}
      </div>
    </li>
  );
}

function invitationStatusVariant(
  status: CollaborationRequestStatus,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "accepted") return "default";
  if (status === "declined" || status === "cancelled") return "secondary";
  if (status === "expired") return "destructive";
  return "outline";
}

function InvitationsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8" aria-hidden>
      <Skeleton className="h-8 w-52" />
      <Skeleton className="mt-8 h-96" />
    </div>
  );
}
