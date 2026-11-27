import Image from "next/image";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { requireCreator } from "@/lib/auth/session";
import { getOwnCreatorProfile } from "@/services/creator-profile.service";
import { listOwnSocialAccounts } from "@/services/social-account.service";
import {
  listMyVerifications,
  listVerifiableSocialAccounts,
} from "@/services/verification.service";
import { VerificationManager } from "@/components/creator/verification-manager";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "My profile" };

/**
 * Creator profile page — a detailed view of the signed-in creator's own
 * profile and onboarding data. Streams in behind Suspense.
 */
export default function CreatorProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <CreatorProfile />
    </Suspense>
  );
}

async function CreatorProfile() {
  await connection();
  const { user, profile } = await requireCreator();
  const [creatorProfile, socialAccounts, claims, verifiableAccounts] =
    await Promise.all([
      getOwnCreatorProfile(user.id),
      listOwnSocialAccounts(user.id),
      listMyVerifications(user.id),
      listVerifiableSocialAccounts(user.id),
    ]);

  if (!creatorProfile?.onboarding_completed) {
    redirect("/creator/onboarding");
  }

  const displayName = profile.full_name || profile.username || user.email;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          My profile
        </h1>
        <p className="text-sm text-muted-foreground">
          Your public profile is what businesses see when they discover you.
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-12">
        {/* Left column: avatar + basics */}
        <div className="md:col-span-4 flex flex-col gap-6">
          <Card className="flex flex-col items-center gap-4 p-6">
            <div className="relative flex items-center justify-center size-24">
              {profile.avatar_url ? (
                <Image
                  className="rounded-full size-24 object-cover"
                  src={profile.avatar_url}
                  alt=""
                  width={96}
                  height={96}
                  unoptimized
                />
              ) : (
                <div className="flex items-center justify-center size-24 rounded-full bg-muted">
                  <span className="text-sm font-medium">
                    {profile.full_name?.charAt(0) ||
                    profile.username?.charAt(0) ||
                    user.email.charAt(0)}</span>
                </div>
              )}
            </div>
            <h2 className="text-lg font-semibold">{displayName}</h2>
            {profile.username && (
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            )}
            {profile.email && (
              <p className="text-xs text-muted-foreground">{profile.email}</p>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {profile.city || profile.state ? (
                <div className="grid gap-1">
                  {profile.city && (
                    <p className="text-foreground">{profile.city}</p>
                  )}
                  {profile.state && (
                    <p className="text-foreground">{profile.state}</p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No location set</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="grid gap-1">
                {profile.phone ? (
                  <span className="text-foreground">{profile.phone}</span>
                ) : (
                  <span className="text-muted-foreground">
                    No phone added
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right column: onboarding data + social accounts */}
        <div className="md:col-span-8 grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>About you</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="whitespace-pre-wrap">
                {creatorProfile.bio || (
                  <span className="text-muted-foreground">No bio yet</span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Focus areas</CardTitle>
              <CardDescription>
                Niches, content types and how you collaborate.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <div className="grid gap-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Niches
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {creatorProfile.niches.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    creatorProfile.niches.map((niche) => (
                      <Badge key={niche} variant="secondary" className="capitalize">
                        {niche.replace(/_/g, " ")}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <div className="grid gap-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Content types
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {creatorProfile.content_types.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    creatorProfile.content_types.map((type) => (
                      <Badge
                        key={type}
                        variant="secondary"
                        className="capitalize"
                      >
                        {type.replace(/_/g, " ")}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <div className="grid gap-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Open to
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {creatorProfile.collaboration_preferences.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    creatorProfile.collaboration_preferences.map((pref) => (
                      <Badge key={pref} variant="secondary" className="capitalize">
                        {pref.replace(/_/g, " ")}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social accounts</CardTitle>
              <CardDescription>
                Linked accounts stay unverified until reviewed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {socialAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No accounts linked yet.
                </p>
              ) : (
                <ul className="grid gap-2 text-sm">
                  {socialAccounts.map((account) => (
                    <li
                      key={account.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="capitalize">
                        {account.platform}: {account.username}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {account.verification_status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account status</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <dl className="grid gap-2">
                <div className="grid gap-1">
                  <dt className="text-xs font-medium text-muted-foreground">
                    Member since
                  </dt>
                  <dd className="text-foreground">
                    {new Date(profile.created_at).toLocaleDateString(
                      undefined,
                      { month: "long", year: "numeric" },
                    )}
                  </dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-xs font-medium text-muted-foreground">
                    Onboarding
                  </dt>
                  <dd className={["text-foreground", creatorProfile.onboarding_completed ? "text-primary" : "text-muted-foreground"].join(" ")}>
                    {creatorProfile.onboarding_completed ? "Complete" : "In progress"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Edit your profile</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Link
                href="/creator/profile/edit"
                className="inline-flex items-center gap-2 text-sm font-medium"
              >
                Edit profile details
              </Link>
            </CardContent>
          </Card>

          <Card id="verification" className="scroll-mt-8">
            <CardHeader>
              <CardTitle>Verification</CardTitle>
              <CardDescription>
                Request review for your identity, social accounts or audience.
                Nothing is marked verified until a moderator approves it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VerificationManager
                claims={claims}
                accounts={verifiableAccounts}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="h-8 w-32 animate-pulse rounded-xl bg-muted" />
      <div className="mt-6 h-4 w-full max-w-md animate-pulse rounded-xl bg-muted" />
      <div className="mt-8 grid gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="h-48 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
