import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { requireBusiness } from "@/lib/auth/session";
import { getOwnBusinessProfile } from "@/services/business-profile.service";
import {
  campaignFormDefaults,
  CampaignForm,
} from "@/components/business/campaign-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createBusinessCampaignAction } from "../actions";

export const metadata = { title: "New campaign" };

export default function NewCampaignPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-3xl px-4 py-10" aria-hidden>
          <Skeleton className="h-96" />
        </div>
      }
    >
      <NewCampaignLoader />
    </Suspense>
  );
}

async function NewCampaignLoader() {
  await connection();
  const { user } = await requireBusiness();
  const profile = await getOwnBusinessProfile(user.id);
  if (!profile?.onboarding_completed) redirect("/business/onboarding");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">New campaign</h1>
        <p className="text-sm text-muted-foreground">
          Describe the collaboration so creators know whether it fits them.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Campaign details</CardTitle>
          <CardDescription>
            New campaigns start as drafts. Publish when you&apos;re ready for
            applications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CampaignForm
            action={createBusinessCampaignAction}
            defaultValues={campaignFormDefaults()}
          />
        </CardContent>
      </Card>
    </div>
  );
}
