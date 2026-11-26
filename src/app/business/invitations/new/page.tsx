import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { requireBusiness } from "@/lib/auth/session";
import { listBusinessCampaigns } from "@/services/business-campaign.service";
import {
  listCreatorsForInvite,
} from "@/services/business-invitation.service";
import { getOwnBusinessProfile } from "@/services/business-profile.service";
import { InvitationForm } from "@/components/business/invitation-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Invite a creator" };

export default function NewInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-2xl px-4 py-10" aria-hidden>
          <Skeleton className="h-96" />
        </div>
      }
    >
      <NewInvitationLoader />
    </Suspense>
  );
}

async function NewInvitationLoader() {
  await connection();
  const { user } = await requireBusiness();
  const profile = await getOwnBusinessProfile(user.id);
  if (!profile?.onboarding_completed) redirect("/business/onboarding");

  const [creators, campaigns] = await Promise.all([
    listCreatorsForInvite(),
    listBusinessCampaigns(user.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href="/business/invitations"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to invitations
      </Link>
      <div className="mt-6">
        <h1 className="text-2xl font-semibold tracking-tight">Invite a creator</h1>
        <p className="text-sm text-muted-foreground">
          Reach out directly to a creator who fits your campaign.
        </p>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Invitation details</CardTitle>
          <CardDescription>
            You can cancel the invitation while it&apos;s still pending.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InvitationForm
            creators={creators}
            campaigns={campaigns.map((campaign) => ({
              id: campaign.id,
              title: campaign.title,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
