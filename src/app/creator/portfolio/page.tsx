import { connection } from "next/server";
import { Suspense } from "react";

import { requireCreator } from "@/lib/auth/session";
import { listOwnPortfolioItems } from "@/services/portfolio.service";
import { Card } from "@/components/ui/card";
import { PortfolioView } from "./portfolio-view";

export const metadata = { title: "Portfolio" };

/**
 * The portfolio is interactive (add/delete), so the data is fetched here
 * and handed to a client view. Keeping hooks out of this server component
 * prevents the page from crashing at runtime.
 */
export default function CreatorPortfolioPage() {
  return (
    <Suspense fallback={<PortfolioSkeleton />}>
      <PortfolioLoader />
    </Suspense>
  );
}

async function PortfolioLoader() {
  await connection();
  const { user } = await requireCreator();
  const items = await listOwnPortfolioItems(user.id);

  return <PortfolioView items={items} />;
}

function PortfolioSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="h-8 w-32 animate-pulse rounded-xl bg-muted" />
      <div className="mt-6 h-4 w-full max-w-md animate-pulse rounded-xl bg-muted" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="h-64 animate-pulse rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
