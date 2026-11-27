"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";

import { AddPortfolioDialog, PortfolioCard } from "./page-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PortfolioItem } from "@/types/creator.types";

export function PortfolioView({ items }: { items: PortfolioItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
          <p className="text-sm text-muted-foreground">
            Show brands what you can make. Add links to posts, videos or case
            studies.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <PlusIcon className="size-4 shrink-0" />
          Add item
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-medium">Your showcase is empty</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add your first piece of work so brands can see your style before
              they message you.
            </p>
            <Button className="mt-5" onClick={() => setOpen(true)}>
              <PlusIcon className="size-4 shrink-0" />
              Add your first item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <PortfolioCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <AddPortfolioDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
