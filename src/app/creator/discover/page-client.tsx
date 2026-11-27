"use client";

import Link from "next/link";
import {
  ArrowUpRightIcon,
  ChevronRightIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import type { Campaign } from "@/types/campaign.types";
import { label } from "@/lib/labels";
import { formatMoneyRange } from "@/lib/money";
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

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0) +
    (platformFilter !== "all" ? 1 : 0) +
    (search.trim() ? 1 : 0);

  function clearFilters() {
    setStatusFilter("all");
    setTypeFilter("all");
    setPlatformFilter("all");
    setSearch("");
  }

  return (
    <div className="mt-6 grid gap-3">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_18px_40px_color-mix(in_srgb,var(--foreground)_5%,transparent)]">
        <div className="min-w-0">
          <label
            htmlFor="campaign-search"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Search campaigns
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="campaign-search"
              placeholder="Search title, description, category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 pl-11"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_18px_40px_color-mix(in_srgb,var(--foreground)_5%,transparent)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontalIcon className="size-4 text-muted-foreground" />
            Filters
          </div>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <XIcon className="size-3.5" />
              Clear all
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <FilterSelect
            label="Status"
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as "all" | "published" | "active")}
            options={[
              { value: "all", label: "All" },
              { value: "published", label: "Open for applications" },
              { value: "active", label: "In progress" },
            ]}
          />
          <FilterSelect
            label="Collaboration type"
            value={typeFilter}
            onValueChange={setTypeFilter}
            options={[
              { value: "all", label: "All" },
              ...CAMPAIGN_TYPES.map((t) => ({ value: t, label: label(t) })),
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

        <p className="mt-3 text-xs text-muted-foreground">
          “Open for applications” means you can still apply. “In progress”
          means a creator has already been chosen.
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <p className="text-xs tabular-nums text-muted-foreground">
            {`${filtered.length} of ${campaigns.length} campaigns`}
          </p>
          <p className="text-xs text-muted-foreground">
            {activeFilterCount > 0
              ? `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active`
              : "Showing all opportunities"}
          </p>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Open briefs</h2>
        <span className="text-xs text-muted-foreground">Ready to apply</span>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 py-16 text-center">
          <div className="grid size-12 place-items-center rounded-2xl border border-border bg-card">
            <SearchIcon className="size-5 text-muted-foreground" />
          </div>
          <p className="mt-4 text-sm font-medium">
            {campaigns.length === 0
              ? "No open briefs right now"
              : "No campaigns match your filters"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {campaigns.length === 0
              ? "Check back soon — new campaigns are added all the time."
              : "Try broadening your search."}
          </p>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium transition-colors hover:bg-muted"
            >
              <XIcon className="size-3.5" />
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
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
  const id = `filter-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          id={id}
          className="data-[size=default]:h-12 w-full rounded-xl px-4 text-sm"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="p-1.5">
          {options.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className="min-h-10 cursor-pointer rounded-lg px-3 py-2.5 text-sm capitalize"
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const initials =
    campaign.title
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase() || "CM";

  const patternIndex =
    Array.from(campaign.id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 3;
  const motifOffset = ["left-6", "left-12", "left-20"][patternIndex];

  const budget =
    campaign.budget_min !== null && campaign.budget_max !== null
      ? formatMoneyRange(campaign.budget_min, campaign.budget_max, campaign.currency)
      : "Budget on request";

  return (
    <Link
      href={`/creator/campaigns/${campaign.id}`}
      className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`View details for ${campaign.title}`}
    >
    <Card className="flex h-full flex-col gap-0 overflow-hidden py-0 transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-[0_22px_50px_color-mix(in_srgb,var(--foreground)_9%,transparent)]">
      <CardContent className="relative p-0">
        <div className="relative aspect-[16/10] overflow-hidden border-b border-border bg-gradient-to-br from-foreground/10 via-muted to-background">
          <div
            aria-hidden
            className={`absolute -top-12 size-40 rounded-full border border-foreground/10 ${motifOffset}`}
          />
          <div
            aria-hidden
            className="absolute -bottom-16 right-0 size-48 rounded-full border border-foreground/10"
          />
          <div
            aria-hidden
            className="absolute inset-y-8 right-10 w-px rotate-12 bg-foreground/10"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-4 right-3 select-none text-[5.5rem] font-black leading-none tracking-[-0.09em] text-foreground/10"
          >
            {initials}
          </span>

          <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-2">
            <Badge
              className="capitalize shadow-sm"
              variant={campaign.collaboration_type === "paid" ? "default" : "outline"}
            >
              {label(campaign.collaboration_type)}
            </Badge>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-2 py-1 text-[10px] font-medium capitalize text-muted-foreground backdrop-blur">
              <span
                className={
                  campaign.status === "active"
                    ? "size-1.5 rounded-full bg-foreground"
                    : "size-1.5 rounded-full border border-foreground"
                }
              />
              {label(campaign.status)}
            </span>
          </div>

          <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-2">
            <span className="rounded-xl border border-border bg-card/90 px-2.5 py-1.5 text-[11px] font-medium capitalize backdrop-blur">
              {campaign.category}
            </span>
            <span className="grid size-9 place-items-center rounded-full border border-border bg-card/90 backdrop-blur transition-transform group-hover:translate-x-0.5">
              <ArrowUpRightIcon className="size-4" />
            </span>
          </div>
        </div>
      </CardContent>

      <CardHeader className="gap-2 px-4 py-4">
        <CardTitle className="line-clamp-1">{campaign.title}</CardTitle>
        <CardDescription className="line-clamp-2 min-h-10">
          {campaign.description}
        </CardDescription>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {campaign.platforms.slice(0, 3).map((platform) => (
            <Badge
              key={platform}
              variant="outline"
              className="text-[10px] capitalize"
            >
              {platform}
            </Badge>
          ))}
          {campaign.platforms.length > 3 && (
            <Badge variant="ghost" className="text-[10px]">
              +{campaign.platforms.length - 3}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardFooter className="mt-auto border-t px-4 py-3">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Budget ({campaign.currency})
            </p>
            <p className="truncate text-sm font-medium tabular-nums">{budget}</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium">
            View details
            <ChevronRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </CardFooter>
    </Card>
    </Link>
  );
}
