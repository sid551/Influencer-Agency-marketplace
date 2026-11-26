"use client";

import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { useMemo, useState } from "react";

import type { Campaign } from "@/types/campaign.types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CAMPAIGN_TYPES = [
  "paid",
  "ugc",
  "affiliate",
  "product_seeding",
  "sponsorship",
  "contest",
] as const;

const PLATFORMS = [
  "instagram",
  "youtube",
  "facebook",
  "tiktok",
  "x",
  "linkedin",
  "other",
] as const;

export function CampaignDiscovery({ campaigns }: { campaigns: Campaign[] }) {
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "active">("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (typeFilter !== "all" && c.collaboration_type !== typeFilter) return false;
      if (platformFilter !== "all" && !c.platforms.includes(platformFilter)) return false;
      if (q) {
        const haystack = `${c.title} ${c.description} ${c.category}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [campaigns, statusFilter, typeFilter, platformFilter, search]);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-12">
      <aside className="lg:col-span-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_18px_40px_color-mix(in_srgb,var(--foreground)_5%,transparent)] space-y-4">
          <h2 className="text-sm font-semibold">Filters</h2>
          <FilterSelect
            label="Status"
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as "all" | "published" | "active")}
            options={[
              { value: "all", label: "All" },
              { value: "published", label: "Published" },
              { value: "active", label: "Active" },
            ]}
          />
          <FilterSelect
            label="Collaboration type"
            value={typeFilter}
            onValueChange={setTypeFilter}
            options={[
              { value: "all", label: "All" },
              ...CAMPAIGN_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, " ") })),
            ]}
          />
          <FilterSelect
            label="Platform"
            value={platformFilter}
            onValueChange={setPlatformFilter}
            options={[
              { value: "all", label: "All" },
              ...PLATFORMS.map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) })),
            ]}
          />
        </div>
      </aside>

      <section className="lg:col-span-9">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_18px_40px_color-mix(in_srgb,var(--foreground)_5%,transparent)]">
          <label className="text-xs font-medium text-muted-foreground block mb-2">
            Search campaigns
          </label>
          <Input
            placeholder="Search title, description, category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            {filtered.length} of {campaigns.length} campaigns
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">
              No campaigns match your filters. Try broadening your search.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="capitalize">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  return (
    <Card className="overflow-hidden hover:border-primary transition-colors">
      <CardContent className="p-0 relative aspect-[4/3] overflow-hidden bg-muted">
        <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground text-sm">
          Campaign media
        </div>
        <Badge
          className="absolute top-3 left-3 z-10 capitalize"
          variant={campaign.collaboration_type === "paid" ? "default" : "outline"}
        >
          {campaign.collaboration_type.replace(/_/g, " ")}
        </Badge>
      </CardContent>
      <CardHeader>
        <CardTitle className="line-clamp-1">{campaign.title}</CardTitle>
        <CardDescription className="line-clamp-2 text-sm">
          {campaign.description}
        </CardDescription>
      </CardHeader>
      <CardFooter className="border-t px-4 py-3 flex-col items-stretch gap-2">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="text-xs capitalize">
            {campaign.category}
          </Badge>
          <span className="text-xs text-muted-foreground truncate">
            {campaign.platforms.join(", ")}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {campaign.budget_min !== null && campaign.budget_max !== null
              ? `$${campaign.budget_min}–$${campaign.budget_max} ${campaign.currency}`
              : "Budget on request"}
          </span>
          <Link
            href={`/creator/campaigns/${campaign.id}`}
            className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1"
          >
            View details <ChevronRightIcon className="size-3.5" />
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
