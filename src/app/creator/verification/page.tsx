import { Suspense } from "react";
import { connection } from "next/server";

import { requireCreator } from "@/lib/auth/session";
import {
  listMyVerifications,
  listVerifiableSocialAccounts,
} from "@/services/verification.service";
import { Card } from "@/components/ui/card";
import { VerificationManager } from "./verification-manager";

export const metadata = { title: "Verification" };

/** Verification claims are private, so the whole view streams in behind
 *  Suspense after the session check (Cache Components rule). */
export default function CreatorVerificationPage() {
  return (
    <Suspense fallback={<VerificationSkeleton />}>
      <VerificationLoader />
    </Suspense>
  );
}

async function VerificationLoader() {
  await connection();
  const { user } = await requireCreator();
  const [claims, accounts] = await Promise.all([
    listMyVerifications(user.id),
    listVerifiableSocialAccounts(user.id),
  ]);

  return <VerificationManager claims={claims} accounts={accounts} />;
}

function VerificationSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="h-8 w-36 animate-pulse rounded-xl bg-muted" />
      <div className="mt-8 grid gap-6">
        <Card className="h-64 animate-pulse" />
        <Card className="h-40 animate-pulse" />
      </div>
    </div>
  );
}
