"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRightIcon, ChevronLeftIcon, ChevronRightIcon, SparklesIcon } from "lucide-react";

import type { RecommendationPage, RecommendedCampaign } from "@/types/recommendation.types";
import { creatorCampaignPath } from "@/lib/campaign-paths";
import { label } from "@/lib/labels";
import { formatMoneyRange } from "@/lib/money";
import { RECOMMENDATION_SECTIONS } from "@/lib/recommendation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function CampaignDiscovery({
  sections,
}: {
  sections: RecommendationPage[];
}) {
  return (
    <div className="mt-8 grid gap-12">
      {RECOMMENDATION_SECTIONS.map((meta) => {
        const section = sections.find((item) => item.section === meta.key);
        if (!section) return null;

        return (
          <section key={meta.key} aria-labelledby={`section-${meta.key}`}>
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-card">
                  <SparklesIcon className="size-4 text-muted-foreground" />
                </span>
                <div>
                  <h2
                    id={`section-${meta.key}`}
                    className="text-lg font-semibold tracking-tight sm:text-xl"
                  >
                    {meta.title}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                    {meta.description}
                  </p>
                </div>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">
                {section.total} campaign{section.total === 1 ? "" : "s"}
              </span>
            </div>

            {section.items.length === 0 ? (
              <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 py-14 text-center">
                <p className="text-sm font-medium">Nothing here yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {meta.key === "recommended"
                    ? "Update your niches in profile settings to get closer matches."
                    : "Check back soon — new campaigns are added all the time."}
                </p>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {section.items.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    matchLabel={meta.label}
                  />
                ))}
              </div>
            )}

            {section.totalPages > 1 ? (
              <Pagination section={section} />
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function Pagination({ section }: { section: RecommendationPage }) {
  const previousPage = section.page - 1;
  const nextPage = section.page + 1;

  return (
    <nav
      className="mt-6 flex items-center justify-between gap-3"
      aria-label={`${section.section} pagination`}
    >
      <PageLink
        section={section.section}
        page={previousPage}
        disabled={section.page <= 1}
        label="Previous"
        icon="left"
      />
      <span className="text-xs tabular-nums text-muted-foreground">
        Page {section.page} of {section.totalPages}
      </span>
      <PageLink
        section={section.section}
        page={nextPage}
        disabled={section.page >= section.totalPages}
        label="Next"
        icon="right"
      />
    </nav>
  );
}

function PageLink({
  section,
  page,
  disabled,
  label: text,
  icon,
}: {
  section: string;
  page: number;
  disabled: boolean;
  label: string;
  icon: "left" | "right";
}) {
  const className =
    "inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-medium transition-colors hover:bg-muted";
  const Icon = icon === "left" ? ChevronLeftIcon : ChevronRightIcon;

  if (disabled) {
    return (
      <span className={`${className} cursor-not-allowed opacity-50`} aria-disabled>
        <Icon className="size-3.5" />
        {text}
      </span>
    );
  }

  return (
    <Link href={`/creator/discover?${section}=${page}`} className={className}>
      <Icon className="size-3.5" />
      {text}
    </Link>
  );
}

export function CampaignCard({
  campaign,
  matchLabel,
}: {
  campaign: RecommendedCampaign;
  matchLabel: string;
}) {
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
      href={creatorCampaignPath(campaign)}
      className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`View details for ${campaign.title}`}
    >
      <Card className="flex h-full flex-col gap-0 overflow-hidden py-0 transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-[0_22px_50px_color-mix(in_srgb,var(--foreground)_9%,transparent)]">
        <CardContent className="relative p-0">
          <div className="relative aspect-[16/10] overflow-hidden border-b border-border bg-gradient-to-br from-foreground/10 via-muted to-background">
            {campaign.image_url ? (
              <Image
                src={campaign.image_url}
                alt={campaign.image_alt || `${campaign.title} campaign photo`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            ) : (
              <>
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
              </>
            )}

            <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-2">
              <Badge
                className="capitalize shadow-sm"
                variant={campaign.collaboration_type === "paid" ? "default" : "outline"}
              >
                {label(campaign.collaboration_type)}
              </Badge>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground bg-foreground px-2 py-1 text-[10px] font-medium text-background">
                {matchLabel}
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
            {campaign.target_niches.slice(0, 3).map((niche) => (
              <Badge
                key={niche}
                variant="secondary"
                className="text-[10px] capitalize"
              >
                {label(niche)}
              </Badge>
            ))}
            {campaign.target_niches.length > 3 && (
              <Badge variant="ghost" className="text-[10px]">
                +{campaign.target_niches.length - 3}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {campaign.platforms.slice(0, 3).map((platform) => (
              <Badge
                key={platform}
                variant="outline"
                className="text-[10px] capitalize"
              >
                {platform}
              </Badge>
            ))}
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
