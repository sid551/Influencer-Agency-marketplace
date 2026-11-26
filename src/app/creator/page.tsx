import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { SparklesIcon } from "lucide-react";

import { requireCreator } from "@/lib/auth/session";
import { getOwnCreatorProfile } from "@/services/creator-profile.service";
import { listOwnSocialAccounts } from "@/services/social-account.service";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Dashboard" };

/**
 * Creator landing page. The session read streams in behind Suspense;
 * inside it we either send the user to onboarding (profile incomplete)
 * or show their real dashboard data.
 */
export default function CreatorDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <CreatorDashboard />
    </Suspense>
  );
}

async function CreatorDashboard() {
  // Session validation uses Date.now(); defer to request time (see
  // https://nextjs.org/docs/messages/blocking-prerender-current-time).
  await connection();
  const { user, profile } = await requireCreator();
  const creatorProfile = await getOwnCreatorProfile(user.id);

  // Not finished onboarding → resume it (proxy already guards /creator).
  if (!creatorProfile?.onboarding_completed) {
    redirect("/creator/onboarding");
  }

  const socialAccounts = await listOwnSocialAccounts(user.id);

  const displayName = profile.full_name || profile.username || user.email;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {displayName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s the current state of your creator profile.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>How businesses see you.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <DetailRow label="Username" value={profile.username} />
            <DetailRow
              label="Location"
              value={[profile.city, profile.state]
                .filter(Boolean)
                .join(", ")}
            />
            <DetailRow
              label="Bio"
              value={creatorProfile.bio ?? undefined}
              clamp
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Focus areas</CardTitle>
            <CardDescription>Niches and content you create.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <TagRow label="Niches" values={creatorProfile.niches} />
            <TagRow label="Content" values={creatorProfile.content_types} />
            <TagRow
              label="Open to"
              values={creatorProfile.collaboration_preferences}
            />
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
                No accounts linked yet. Add them during onboarding or from
                your profile later.
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
            <CardTitle>Next steps</CardTitle>
            <CardDescription>
              Browse campaigns, apply to collaborations, and keep up with your
              messages.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <SparklesIcon className="size-3.5 shrink-0 text-primary" />
              Your account is ready — discover campaigns that match your niche
              and apply when you find a good fit.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  clamp,
}: {
  label: string;
  value?: string | null;
  clamp?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        className={
          clamp ? "line-clamp-3 text-foreground" : "text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function TagRow({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {values.length === 0 ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {values.map((value) => (
            <Badge key={value} variant="secondary" className="capitalize">
              {value.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="mt-2 h-4 w-96 max-w-full" />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-48 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
