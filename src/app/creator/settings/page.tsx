import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { requireCreator } from "@/lib/auth/session";
import { listOwnSocialAccounts } from "@/services/social-account.service";
import {
  SocialAccountsList,
  AddSocialAccountForm,
} from "./page-client";

export const metadata = { title: "Settings" };

/**
 * Creator settings page. Manages linked social accounts and other
 * account preferences. Streams in behind Suspense.
 */
export default function CreatorSettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsLoader />
    </Suspense>
  );
}

async function SettingsLoader() {
  await connection();
  const { user } = await requireCreator();
  const accounts = await listOwnSocialAccounts(user.id);

  return <SettingsView accounts={accounts} />;
}

function SettingsView({
  accounts,
}: {
  accounts: Awaited<ReturnType<typeof listOwnSocialAccounts>>;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        Settings
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your account and connected social profiles.
      </p>

      <div className="mt-8 grid gap-6">
        <SocialAccountsSection accounts={accounts} />
      </div>
    </div>
  );
}

function SocialAccountsSection({
  accounts,
}: {
  accounts: Awaited<ReturnType<typeof listOwnSocialAccounts>>;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-[0_18px_40px_color-mix(in_srgb,var(--foreground)_5%,transparent)]">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Social accounts</h2>
          <p className="text-xs text-muted-foreground">
            Linked accounts stay unverified until manually reviewed.{" "}
            <Link href="/creator/profile#verification" className="underline">
              Request verification
            </Link>
          </p>
        </div>
        <AddSocialAccountForm />
      </div>
      <div className="px-4 py-4">
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No accounts linked yet. Add one below.
          </p>
        ) : (
          <SocialAccountsList accounts={accounts} />
        )}
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="h-8 w-32 animate-pulse rounded-xl bg-muted" />
      <div className="mt-8 rounded-2xl border border-border bg-card shadow-[0_18px_40px_color-mix(in_srgb,var(--foreground)_5%,transparent)]">
        <div className="border-b px-4 py-3">
          <div className="h-4 w-48 animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="px-4 py-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
