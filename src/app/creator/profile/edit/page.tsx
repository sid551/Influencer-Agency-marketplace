import { connection } from "next/server";
import { Suspense } from "react";

import { requireCreator } from "@/lib/auth/session";
import { getOwnCreatorNiches } from "@/services/creator-niche.service";
import { ProfileEditForm } from "./profile-edit-form";
import type { ProfileEditValues } from "@/lib/validations/profile";

export const metadata = { title: "Edit profile" };

/**
 * Load the current profile so the edit form starts with real values.
 * A blank form here used to make people retype everything — and risked
 * overwriting details they hadn't intended to change.
 *
 * The session/database read streams in behind Suspense as required by
 * Cache Components (see the other creator pages).
 */
export default function ProfileEditPage() {
  return (
    <Suspense fallback={<ProfileEditSkeleton />}>
      <ProfileEditLoader />
    </Suspense>
  );
}

async function ProfileEditLoader() {
  await connection();
  const { user, profile } = await requireCreator();
  const { primary, niches } = await getOwnCreatorNiches(user.id);

  return (
    <ProfileEditForm
      defaultValues={{
        fullName: profile.full_name ?? "",
        username: profile.username ?? "",
        avatarUrl: profile.avatar_url ?? "",
        city: profile.city ?? "",
        state: profile.state ?? "",
        phone: profile.phone ?? "",
        niches,
        primaryNiche: primary as ProfileEditValues["primaryNiche"],
      }}
    />
  );
}

function ProfileEditSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10" aria-hidden>
      <div className="h-8 w-48 animate-pulse rounded-xl bg-muted" />
      <div className="mt-8 rounded-3xl border border-border bg-card p-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="mb-5 h-12 w-full animate-pulse rounded-xl bg-muted"
          />
        ))}
      </div>
    </div>
  );
}
