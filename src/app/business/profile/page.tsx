import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { requireBusiness } from "@/lib/auth/session";
import { getOwnBusinessProfile } from "@/services/business-profile.service";
import { BusinessProfileForm } from "@/components/business/business-profile-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { saveBusinessProfile } from "./actions";

export const metadata = { title: "Company profile" };

export default function BusinessProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-2xl px-4 py-10" aria-hidden>
          <Skeleton className="h-96" />
        </div>
      }
    >
      <ProfileLoader />
    </Suspense>
  );
}

async function ProfileLoader() {
  await connection();
  const { user } = await requireBusiness();
  const profile = await getOwnBusinessProfile(user.id);
  if (!profile?.onboarding_completed) redirect("/business/onboarding");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Company profile</h1>
        <p className="text-sm text-muted-foreground">
          This information is shown to creators alongside your campaigns.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Keep your company information up to date.</CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessProfileForm
            action={saveBusinessProfile}
            submitLabel="Save profile"
            defaultValues={{
              company_name: profile.company_name,
              website: profile.website ?? "",
              description: profile.description ?? "",
              industry: profile.industry ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
