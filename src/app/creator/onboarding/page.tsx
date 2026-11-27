import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { requireCreator } from "@/lib/auth/session";
import { getOwnCreatorProfile } from "@/services/creator-profile.service";
import { listOwnSocialAccounts } from "@/services/social-account.service";
import { OnboardingWizard } from "./onboarding-wizard";
import {
  TOTAL_ONBOARDING_STEPS,
  type OnboardingValues,
} from "@/lib/validations/onboarding";
import type { Profile } from "@/types/creator.types";

export const metadata = { title: "Set up your profile" };

/**
 * Onboarding entry point. The session read streams in behind Suspense;
 * completed users are sent back to the dashboard, everyone else gets
 * the wizard resumed at their first unfinished step.
 */
export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div
          className="mx-auto w-full max-w-2xl px-4 py-10"
          aria-hidden
        >
          <div className="h-8 w-56 animate-pulse rounded-xl bg-muted" />
          <div className="mt-6 h-4 w-full max-w-md animate-pulse rounded-xl bg-muted" />
          <div className="mt-10 h-72 animate-pulse rounded-3xl bg-muted" />
        </div>
      }
    >
      <OnboardingLoader />
    </Suspense>
  );
}

async function OnboardingLoader() {
  // The Supabase session check calls Date.now(); defer it to request time
  // so prerendering the static shell stays deterministic.
  await connection();
  const { user, profile } = await requireCreator();
  const creatorProfile = await getOwnCreatorProfile(user.id);

  if (creatorProfile?.onboarding_completed) {
    redirect("/creator/discover");
  }

  const socialAccounts = await listOwnSocialAccounts(user.id);

  return (
    <OnboardingWizard
      profile={profile}
      initialStep={Math.min(
        (creatorProfile?.onboarding_step ?? 0) + 1,
        TOTAL_ONBOARDING_STEPS,
      )}
      initialSocialAccounts={socialAccounts}
      initialValues={buildInitialValues(profile, creatorProfile)}
    />
  );
}

type InitialValues = OnboardingValues;

function buildInitialValues(
  profile: Profile,
  creatorProfile: {
    bio: string | null;
    niches: string[];
    languages: string[];
    content_types: string[];
    collaboration_preferences: string[];
  } | null,
): InitialValues {
  return {
    fullName: profile.full_name ?? "",
    username: profile.username ?? "",
    avatarUrl: profile.avatar_url ?? "",
    city: profile.city ?? "",
    state: profile.state ?? "",
    bio: creatorProfile?.bio ?? "",
    niches: creatorProfile?.niches ?? [],
    languages: creatorProfile?.languages ?? [],
    contentTypes: creatorProfile?.content_types ?? [],
    collaborationPreferences:
      creatorProfile?.collaboration_preferences ?? [],
    phone: profile.phone ?? "",
  };
}
