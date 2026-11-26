import type { Metadata } from "next";
import Link from "next/link";
import { Check, HeartHandshake, MessagesSquare, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
};

const steps = [
  {
    icon: Sparkles,
    title: "Discover",
    description:
      "Browse creators and campaigns with clear rates, platforms, and expectations up front.",
  },
  {
    icon: MessagesSquare,
    title: "Agree on the details",
    description:
      "Send proposals, negotiate deliverables, and keep every decision in one shared thread.",
  },
  {
    icon: HeartHandshake,
    title: "Collaborate",
    description:
      "Track progress through to completion, with status everyone can see at a glance.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-14 sm:py-20">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
        About the marketplace
      </p>
      <h1 className="mt-3 max-w-2xl text-3xl leading-tight font-semibold tracking-tight text-foreground sm:text-4xl">
        Better collaborations start with clearer expectations.
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
        This marketplace connects social media creators with businesses for
        paid collaborations. Creators discover campaigns, apply with
        proposals, and manage agreed deliverables through to completion —
        with the terms always easy to find.
      </p>

      <div className="mt-12 grid gap-5 sm:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.title}
            className="rounded-3xl border border-border bg-card p-5 shadow-[0_18px_40px_color-mix(in_srgb,var(--foreground)_5%,transparent)]"
          >
            <span className="flex size-10 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <step.icon className="size-5" />
            </span>
            <h2 className="mt-4 text-sm font-semibold text-foreground">
              {step.title}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {step.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-3xl border border-primary/20 bg-primary/5 p-6 sm:p-7">
        <div className="flex items-start gap-3">
          <Check className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Built for both sides of the deal
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Creators get a clear view of what brands want and what they will
              be paid. Businesses get a roster they can trust, with proposals
              and deliverables in one place.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-[0_8px_20px_color-mix(in_srgb,var(--primary)_20%,transparent)] transition-all hover:-translate-y-0.5 hover:bg-primary/90"
          >
            Join free
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-10 items-center rounded-full border border-border bg-card px-5 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-secondary/70"
          >
            Talk to us
          </Link>
        </div>
      </div>
    </div>
  );
}
