import { connection } from "next/server";
import { Suspense } from "react";

import { requireCreator } from "@/lib/auth/session";
import { listOwnPortfolioItems } from "@/services/portfolio.service";
import {
  PortfolioCard,
  AddPortfolioDialog,
} from "./page-client";

export const metadata = { title: "Portfolio" };

/**
 * Creator portfolio page. Server component that fetches the signed-in
 * creator's portfolio items and renders them alongside client
 * components for add/delete interactions.
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

function PortfolioView({
  items,
}: {
  items: Awaited<ReturnType<typeof listOwnPortfolioItems>>;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Portfolio
          </h1>
          <p className="text-sm text-muted-foreground">
            Showcase your work — images, videos and content samples.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <PlusIcon className="size-4 shrink-0" />
          Add item
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyPortfolio />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <PortfolioCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <AddPortfolioDialog
        open={open}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

function EmptyPortfolio() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-muted-foreground">
          No portfolio items yet. Add your first piece of work to
          start building your public showcase.
        </p>
      </CardContent>
    </Card>
  );
}

function PortfolioSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="h-8 w-32 animate-pulse rounded-xl bg-muted" />
      <div className="mt-6 h-4 w-full max-w-md animate-pulse rounded-xl bg-muted" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="h-64 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

import React from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
