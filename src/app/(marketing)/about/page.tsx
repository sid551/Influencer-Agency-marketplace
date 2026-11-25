import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        About
      </h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">
        This marketplace connects social media creators with businesses for
        paid collaborations. Creators discover campaigns, apply with
        proposals, and manage agreed deliverables through to completion.
      </p>
    </div>
  );
}
