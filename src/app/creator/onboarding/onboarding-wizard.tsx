"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch, type FieldPath } from "react-hook-form";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Loader2Icon,
  PencilIcon,
} from "lucide-react";

import {
  completeOnboarding,
  saveOnboardingStep,
} from "./actions";
import { applyFieldErrors, StepFields } from "./step-fields";
import { SocialAccountsStep } from "./social-accounts-step";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { verificationStatusLabel } from "@/lib/labels";
import type { InstagramNotice } from "@/lib/instagram-oauth";
import {
  getStepSchema,
  TOTAL_ONBOARDING_STEPS,
  type OnboardingValues,
} from "@/lib/validations/onboarding";
import type { Profile, SocialAccount } from "@/types/creator.types";

/**
 * The database tracks 12 small steps, but asking someone to click "Next"
 * twelve times is exhausting. We group related steps into five short
 * screens and still save each underlying step individually, so progress
 * and resuming work exactly as before.
 */
type WizardGroup = {
  title: string;
  description: string;
  steps: number[];
};

const GROUPS: WizardGroup[] = [
  {
    title: "First, the basics",
    description: "A few details so brands know who they're talking to.",
    steps: [1, 2, 3, 4],
  },
  {
    title: "What do you create?",
    description: "This is what we use to match you with relevant briefs.",
    steps: [5, 6, 7, 8],
  },
  {
    title: "Connect your Instagram",
    description:
      "Optional, but connecting shows brands your real numbers. You can skip this and do it later.",
    steps: [9],
  },
  {
    title: "How would you like to work?",
    description: "Pick what you're open to. Your phone number stays private.",
    steps: [10, 11],
  },
  {
    title: "One last look",
    description: "Check everything, then you're ready to go.",
    steps: [12],
  },
];

const GROUP_COUNT = GROUPS.length;

const STEP_CAPTIONS: Record<number, string> = {
  1: "Your name",
  2: "Public handle",
  3: "Profile photo (optional)",
  4: "Location",
  5: "About you",
  6: "Topics you create about",
  7: "Languages",
  8: "Content formats",
  10: "Collaboration preferences",
  11: "Phone number (optional)",
};

function groupForStep(step: number): number {
  const index = GROUPS.findIndex((group) => group.steps.includes(step));
  return index === -1 ? 1 : index + 1;
}

interface OnboardingWizardProps {
  profile: Profile;
  /** Number of completed database steps (0–12). */
  initialStep: number;
  initialSocialAccounts: SocialAccount[];
  initialValues: OnboardingValues;
  instagramNotice?: InstagramNotice | null;
  instagramConfigured?: boolean;
}

export function OnboardingWizard({
  profile,
  initialStep,
  initialSocialAccounts,
  initialValues,
  instagramNotice,
  instagramConfigured = true,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [group, setGroup] = useState(() =>
    groupForStep(Math.min(Math.max(initialStep + 1, 1), TOTAL_ONBOARDING_STEPS)),
  );
  // Set when the user jumps from the review screen to fix something:
  // after saving, return straight to the review instead of walking on.
  const [returnTo, setReturnTo] = useState<number | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>(
    initialSocialAccounts,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<OnboardingValues>({ defaultValues: initialValues });
  const meta = GROUPS[group - 1] ?? GROUPS[0];
  const isReview = group === GROUP_COUNT;
  const isSocialStep = meta.steps.includes(9);
  // Social accounts manage their own form, so don't wrap that screen in one.
  const usesForm = !isReview && !isSocialStep;
  // Live values for the review step (useWatch is compiler-safe,
  // unlike form.watch()).
  const values = useWatch({ control: form.control }) as OnboardingValues;

  function goTo(next: number, options?: { returnTo?: number }) {
    form.clearErrors();
    setActionError(null);
    setReturnTo(options?.returnTo ?? null);
    setGroup(next);
  }

  /** Validate every field owned by a screen and show all issues at once. */
  function validateGroup(target: number): boolean {
    form.clearErrors();
    let valid = true;

    for (const step of GROUPS[target - 1].steps) {
      const schema = getStepSchema(step);
      if (!schema) continue;
      const result = schema.safeParse(form.getValues());
      if (result.success) continue;

      valid = false;
      for (const issue of result.error.issues) {
        const key = issue.path.join(".");
        if (key) {
          form.setError(key as FieldPath<OnboardingValues>, {
            type: "manual",
            message: issue.message,
          });
        }
      }
    }
    return valid;
  }

  /** Save each database step behind this screen, one at a time. */
  async function persistGroup(
    target: number,
    options?: { skipInvalid?: boolean },
  ): Promise<boolean> {
    const payload = form.getValues();

    for (const step of GROUPS[target - 1].steps) {
      if (step >= TOTAL_ONBOARDING_STEPS) continue; // review writes nothing

      const schema = getStepSchema(step);
      if (schema && !schema.safeParse(payload).success) {
        if (options?.skipInvalid) continue;
        return false;
      }

      const state = await saveOnboardingStep({ step, values: payload });
      if (!state.ok) {
        if (!applyFieldErrors(form, state.fieldErrors)) {
          setActionError(state.message);
        }
        return false;
      }
    }
    return true;
  }

  function handleNext() {
    setActionError(null);

    if (isReview) {
      startTransition(async () => {
        const state = await completeOnboarding();
        if (!state.ok) setActionError(state.message);
      });
      return;
    }

    if (!validateGroup(group)) return;

    const destination = returnTo ?? Math.min(group + 1, GROUP_COUNT);
    startTransition(async () => {
      const saved = await persistGroup(group);
      if (saved) goTo(destination);
    });
  }

  function handleBack() {
    if (group > 1) goTo(group - 1);
  }

  function handleSaveAndExit() {
    setActionError(null);
    if (isReview) {
      router.push("/");
      return;
    }

    // Save whatever is valid and leave to the public homepage. Discovery
    // would only redirect straight back here while setup is unfinished.
    startTransition(async () => {
      await persistGroup(group, { skipInvalid: true });
      router.push("/");
    });
  }

  const progressPercent =
    group === GROUP_COUNT
      ? 100
      : Math.round(((group - 1) / (GROUP_COUNT - 1)) * 100);

  const card = isSocialStep ? (
    <SocialAccountsStep
      accounts={socialAccounts}
      onChange={setSocialAccounts}
      instagramNotice={instagramNotice}
      instagramConfigured={instagramConfigured}
    />
  ) : isReview ? (
    <ReviewStep
      values={values}
      profile={profile}
      socialAccounts={socialAccounts}
      onEdit={(step) => goTo(groupForStep(step), { returnTo: GROUP_COUNT })}
    />
  ) : (
    <Form {...form}>
      <div className="grid gap-6">
        {meta.steps.map((step) => (
          <div key={step} className="grid gap-2">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {STEP_CAPTIONS[step]}
            </p>
            <StepFields step={step} form={form} />
          </div>
        ))}
      </div>
    </Form>
  );

  const navigation = (
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
      <Button
        type="button"
        variant="outline"
        onClick={handleBack}
        disabled={isPending || group === 1}
      >
        <ArrowLeftIcon />
        Back
      </Button>
      <Button
        type={usesForm ? "submit" : "button"}
        onClick={usesForm ? undefined : handleNext}
        disabled={isPending}
        className="min-w-32"
      >
        {isPending ? (
          <>
            <Loader2Icon className="animate-spin" />
            Saving…
          </>
        ) : isReview ? (
          "Finish setup"
        ) : group === GROUP_COUNT - 1 ? (
          "Review details"
        ) : (
          <>
            Save &amp; continue
            <ArrowRightIcon />
          </>
        )}
      </Button>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium text-foreground">
          {isReview ? "Ready to finish" : `Step ${group} of ${GROUP_COUNT}`}
        </span>
        <button
          type="button"
          onClick={handleSaveAndExit}
          disabled={isPending}
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
        >
          Save what&apos;s done &amp; exit
        </button>
      </div>

      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Setup progress"
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <h1 className="mt-6 text-xl font-semibold tracking-tight">
        {meta.title}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
      {group === 1 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          About 3 minutes in total. You can leave and come back any time.
        </p>
      ) : null}

      {actionError ? (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Could not save</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      {usesForm ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleNext();
          }}
        >
          <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-[0_18px_40px_color-mix(in_srgb,var(--foreground)_5%,transparent)] sm:p-6">
            {card}
          </div>
          {navigation}
        </form>
      ) : (
        <>
          <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-[0_18px_40px_color-mix(in_srgb,var(--foreground)_5%,transparent)] sm:p-6">
            {card}
          </div>
          {navigation}
        </>
      )}

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Your progress is saved as you go — close this page and come back when
        you&apos;re ready.
        <Link
          href="/contact"
          className="ml-1 underline-offset-4 hover:text-foreground hover:underline"
        >
          Need help?
        </Link>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------
// Final screen — review
// ---------------------------------------------------------------

interface ReviewStepProps {
  values: OnboardingValues;
  profile: Profile;
  socialAccounts: SocialAccount[];
  onEdit: (step: number) => void;
}

function ReviewSection({
  title,
  editStep,
  onEdit,
  children,
}: {
  title: string;
  editStep: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-4 last:border-b-0 last:pb-0 first:pt-0">
      <div className="min-w-0">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        <div className="mt-1.5 text-sm">{children}</div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onEdit(editStep)}
        className="shrink-0"
      >
        <PencilIcon />
        Edit
      </Button>
    </div>
  );
}

function ReviewStep({ values, profile, socialAccounts, onEdit }: ReviewStepProps) {
  const tags = (items: string[]) =>
    items.length === 0 ? (
      <span className="text-muted-foreground">None yet</span>
    ) : (
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item} variant="secondary" className="capitalize">
            {item.replace(/_/g, " ")}
          </Badge>
        ))}
      </div>
    );

  return (
    <div>
      <h2 className="text-base font-medium">Does this look right?</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Everything below is already saved. Fix anything before finishing.
      </p>

      <div className="mt-4">
        <ReviewSection title="Basics" editStep={1} onEdit={onEdit}>
          <p className="font-medium">{values.fullName || "—"}</p>
          <p className="text-muted-foreground">
            @{values.username || "—"}
            {profile.email ? ` · ${profile.email}` : ""}
          </p>
          <p className="text-muted-foreground">
            {[values.city, values.state].filter(Boolean).join(", ") ||
              "No location"}
            {values.avatarUrl ? " · photo added" : " · no photo"}
          </p>
        </ReviewSection>

        <ReviewSection title="About you" editStep={5} onEdit={onEdit}>
          <p className="whitespace-pre-wrap">
            {values.bio || "No bio yet"}
          </p>
        </ReviewSection>

        <ReviewSection title="Topics" editStep={6} onEdit={onEdit}>
          {tags(values.niches)}
        </ReviewSection>

        <ReviewSection title="Languages" editStep={7} onEdit={onEdit}>
          {tags(values.languages)}
        </ReviewSection>

        <ReviewSection title="Content formats" editStep={8} onEdit={onEdit}>
          {tags(values.contentTypes)}
        </ReviewSection>

        <ReviewSection title="Social accounts" editStep={9} onEdit={onEdit}>
          {socialAccounts.length === 0 ? (
            <span className="text-muted-foreground">None linked</span>
          ) : (
            <ul className="grid gap-1">
              {socialAccounts.map((account) => (
                <li key={account.id} className="flex items-center gap-2">
                  <span className="capitalize">
                    {account.platform}: {account.username}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {verificationStatusLabel(account.verification_status)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </ReviewSection>

        <ReviewSection
          title="Collaboration preferences"
          editStep={10}
          onEdit={onEdit}
        >
          {tags(values.collaborationPreferences)}
        </ReviewSection>

        <ReviewSection title="Contact" editStep={11} onEdit={onEdit}>
          {values.phone ? (
            <span>{values.phone}</span>
          ) : (
            <span className="text-muted-foreground">No phone added</span>
          )}
        </ReviewSection>
      </div>
    </div>
  );
}
