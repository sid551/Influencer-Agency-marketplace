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
import { saveBusinessOnboarding } from "./actions";

export const metadata = { title: "Set up your business" };

export default function BusinessOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-2xl px-4 py-10" aria-hidden>
          <Skeleton className="h-64" />
        </div>
      }
    >
      <OnboardingLoader />
    </Suspense>
  );
}

async function OnboardingLoader() {
  await connection();
  const { user } = await requireBusiness();
  const profile = await getOwnBusinessProfile(user.id);
  if (profile?.onboarding_completed) redirect("/business");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Tell us about your company</CardTitle>
          <CardDescription>
            Just one company name is required — the rest is optional, and you
            can change everything later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessProfileForm
            action={saveBusinessOnboarding}
            submitLabel="Finish setup & go to dashboard"
            defaultValues={
              profile
                ? {
                    company_name: profile.company_name,
                    website: profile.website ?? "",
                    description: profile.description ?? "",
                    industry: profile.industry ?? "",
                  }
                : undefined
            }
          />
          <p className="mt-4 text-xs text-muted-foreground">
            What happens next: you&apos;ll land on your dashboard, where you can
            create your first campaign.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
