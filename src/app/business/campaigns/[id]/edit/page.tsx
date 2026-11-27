import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { requireBusiness } from "@/lib/auth/session";
import { getBusinessCampaign } from "@/services/business-campaign.service";
import { campaignFormDefaults } from "@/lib/campaign-form-defaults";
import { CampaignForm } from "@/components/business/campaign-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { updateBusinessCampaignAction } from "../../actions";

export const metadata = { title: "Edit campaign" };

export default function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-3xl px-4 py-10" aria-hidden>
          <Skeleton className="h-96" />
        </div>
      }
    >
      <EditCampaignLoader params={params} />
    </Suspense>
  );
}

async function EditCampaignLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const { user } = await requireBusiness();
  const campaign = await getBusinessCampaign(user.id, id);
  if (!campaign) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Edit campaign</h1>
        <p className="text-sm text-muted-foreground">
          Update the brief, budget or status of this campaign.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{campaign.title}</CardTitle>
          <CardDescription>
            Changes are visible to creators when the campaign is published or active.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CampaignForm
            action={updateBusinessCampaignAction}
            defaultValues={campaignFormDefaults(campaign)}
            editing
          />
        </CardContent>
      </Card>
    </div>
  );
}
