import type { Metadata } from "next";
import { Clock, Mail, MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact",
};

const channels = [
  {
    icon: Mail,
    title: "Email",
    description: "Questions about the platform or your account.",
    action: "support@creator-marketplace.com",
    href: "mailto:support@creator-marketplace.com",
  },
  {
    icon: MessageCircle,
    title: "Collaboration help",
    description: "Stuck mid-campaign? Reach out and we will help untangle it.",
    action: "Start a conversation",
    href: "mailto:support@creator-marketplace.com?subject=Collaboration%20help",
  },
  {
    icon: Clock,
    title: "Response time",
    description: "We usually reply within one business day.",
    action: "Mon – Fri",
    href: null,
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-14 sm:py-20">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
        Contact
      </p>
      <h1 className="mt-3 max-w-xl text-3xl leading-tight font-semibold tracking-tight text-foreground sm:text-4xl">
        Questions about the platform? We&apos;re here.
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
        Whether you are a creator figuring out your first proposal or a brand
        building a roster, send us a note and a human will get back to you.
      </p>

      <div className="mt-12 grid gap-5 sm:grid-cols-3">
        {channels.map((channel) => {
          const body = (
            <>
              <span className="flex size-10 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <channel.icon className="size-5" />
              </span>
              <h2 className="mt-4 text-sm font-semibold text-foreground">
                {channel.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {channel.description}
              </p>
              <p className="mt-4 text-sm font-medium text-primary">
                {channel.action}
              </p>
            </>
          );

          return channel.href ? (
            <a
              key={channel.title}
              href={channel.href}
              className="group rounded-3xl border border-border bg-card p-5 shadow-[0_18px_40px_color-mix(in_srgb,var(--foreground)_5%,transparent)] transition-all hover:-translate-y-1 hover:border-primary/30"
            >
              {body}
            </a>
          ) : (
            <div
              key={channel.title}
              className="rounded-3xl border border-border bg-card p-5 shadow-[0_18px_40px_color-mix(in_srgb,var(--foreground)_5%,transparent)]"
            >
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
