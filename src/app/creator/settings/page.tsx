import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { InstagramConnectCard } from "@/components/creator/instagram-connect-card";
import { requireCreator } from "@/lib/auth/session";
import {
  isInstagramConfigured,
  readInstagramNotice,
} from "@/lib/instagram-oauth";
import { listOwnSocialAccounts } from "@/services/social-account.service";
import {
  SocialAccountsList,
  AddSocialAccountForm,
  InstagramDisconnectButton,
} from "./page-client";

export const metadata = { title: "Settings" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Creator settings page. Manages linked social accounts and other
 * account preferences. Streams in behind Suspense.
 */
export default function CreatorSettingsPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsLoader searchParams={searchParams} />
    </Suspense>
  );
}

async function SettingsLoader({ searchParams }: PageProps) {
  await connection();
  const { user } = await requireCreator();
  const accounts = await listOwnSocialAccounts(user.id);
  const notice = readInstagramNotice(await searchParams);

  return (
    <SettingsView
      accounts={accounts}
      notice={notice}
      configured={isInstagramConfigured(process.env)}
    />
  );
}

function SettingsView({
  accounts,
  notice,
  configured,
}: {
  accounts: Awaited<ReturnType<typeof listOwnSocialAccounts>>;
  notice: ReturnType<typeof readInstagramNotice>;
  configured: boolean;
}) {
  const instagramAccount = accounts.find(
    (account) =>
      account.platform === "instagram" &&
      account.verification_status === "verified" &&
      account.verification_method === "oauth",
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        Settings
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your account and connected social profiles.
      </p>

      <div className="mt-8 grid gap-6">
        <InstagramConnectCard
          account={instagramAccount}
          returnTo="/creator/settings"
          notice={notice}
          configured={configured}
          disconnectButton={<InstagramDisconnectButton />}
        />
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
            Linked accounts stay not verified until we confirm ownership.{" "}
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
            No accounts linked yet. Add one with the form at the top of this
            card.
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
