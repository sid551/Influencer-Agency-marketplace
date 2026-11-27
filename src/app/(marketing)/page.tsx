import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Check,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { formatMoney, formatMoneyRange } from "@/lib/money";

const creatorCard = {
  name: "Aarav Mehta",
  handle: "@aarav.creates",
  location: "Mumbai · Lifestyle",
};

const brandCard = {
  name: "Spring campaign",
  brand: "Northstar Studio",
  budgetMin: 1200,
  budgetMax: 1800,
};

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-28">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="size-3.5 text-primary" />
            Built for better creator–brand work
          </div>

          <h1 className="mt-6 max-w-xl text-4xl leading-[1.05] font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Find the right people to make your next campaign{" "}
            <span className="text-primary">work.</span>
          </h1>

          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
            Discover creators with real taste, agree on the details, and keep
            every collaboration moving — without the usual back-and-forth.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-[0_10px_24px_color-mix(in_srgb,var(--primary)_22%,transparent)] transition-all hover:-translate-y-0.5 hover:bg-primary/90"
            >
              Start as a creator
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-medium text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-secondary/70"
            >
              I&apos;m hiring creators
            </Link>
          </div>

          <div className="mt-9 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-primary" />
              Clear deliverables
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-primary" />
              Built-in messaging
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-primary" />
              Real-time updates
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-10 rounded-[3rem] bg-accent/60 blur-3xl" aria-hidden />

          <div className="relative space-y-4">
            <div className="rounded-3xl border border-border bg-card p-5 shadow-[0_20px_50px_color-mix(in_srgb,var(--foreground)_10%,transparent)]">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                  AM
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {creatorCard.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {creatorCard.handle} · {creatorCard.location}
                  </p>
                </div>
                <span className="ml-auto rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
                  Verified
                </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {["Reels", "Stories", "UGC"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-xl bg-muted px-2 py-2 text-center text-xs font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Typical rate
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">
                    {formatMoney(450)} / deliverable
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                  <MessageCircle className="size-3.5" />
                  Available
                </span>
              </div>
            </div>

            <div className="ml-6 rounded-3xl border border-primary/20 bg-primary p-5 text-primary-foreground shadow-[0_20px_50px_color-mix(in_srgb,var(--primary)_28%,transparent)] sm:ml-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-primary-foreground/70">
                    Campaign matched
                  </p>
                  <p className="mt-1.5 text-lg font-semibold">
                    {brandCard.name}
                  </p>
                  <p className="mt-1 text-sm text-primary-foreground/75">
                    {brandCard.brand}
                  </p>
                </div>
                <Briefcase className="size-5 text-primary-foreground/70" />
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-primary-foreground/15 pt-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-primary-foreground/70">
                    Budget
                  </p>
                  <p className="mt-0.5 text-sm font-semibold">
                    {formatMoneyRange(brandCard.budgetMin, brandCard.budgetMax)}
                  </p>
                </div>
                <span className="rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs font-semibold">
                  Review proposal
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 pb-16 sm:pb-24">
        <div className="grid gap-5 md:grid-cols-2">
          <Link
            href="/signup"
            className="group rounded-3xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_18px_40px_color-mix(in_srgb,var(--foreground)_8%,transparent)] sm:p-7"
          >
            <span className="flex size-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <Users className="size-5" />
            </span>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              For creators
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
              Find campaigns that fit your taste.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Discover brand opportunities, send thoughtful proposals, and keep
              every agreement in one clear place.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">
              Explore as a creator
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>

          <Link
            href="/signup"
            className="group rounded-3xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_18px_40px_color-mix(in_srgb,var(--foreground)_8%,transparent)] sm:p-7"
          >
            <span className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
              <Briefcase className="size-5" />
            </span>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              For brands
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
              Build a roster you can trust.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Publish campaigns, review applications, message creators, and move
              from negotiation to finished work.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">
              Explore as a brand
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </section>

      <section className="border-t border-border/70 bg-card/50">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:grid-cols-3 sm:py-14">
          {[
            {
              icon: Sparkles,
              title: "Taste-first discovery",
              description:
                "Find creators and campaigns that feel like a genuine fit.",
            },
            {
              icon: ShieldCheck,
              title: "Clear collaboration",
              description:
                "Terms, deliverables, and status are always easy to find.",
            },
            {
              icon: MessageCircle,
              title: "One shared thread",
              description:
                "Keep every conversation attached to the work itself.",
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <item.icon className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}