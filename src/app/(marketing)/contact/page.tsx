import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
};

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Contact
      </h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">
        Questions about the platform? Email us at{" "}
        <a
          href="mailto:support@creator-marketplace.com"
          className="font-medium text-foreground underline underline-offset-4"
        >
          support@creator-marketplace.com
        </a>
        .
      </p>
    </div>
  );
}
