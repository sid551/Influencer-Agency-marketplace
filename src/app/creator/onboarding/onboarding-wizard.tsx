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
import {
  getStepSchema,
  TOTAL_ONBOARDING_STEPS,
  type OnboardingValues,
} from "@/lib/validations/onboarding";
import type { Profile, SocialAccount } from "@/types/creator.types";

const STEPS: Array<{ title: string; description: string }> = [
  {
    title: "What should we call you?",
    description: "The name shown on your public profile.",
  },
  {
    title: "Pick a username",
    description: "Your public handle — businesses will search for it.",
  },
  {
    title: "Add a profile photo",
    description: "Optional, but profiles with photos get more interest.",
  },
  {
    title: "Where are you based?",
    description: "City and state help businesses filter by location.",
  },
  {
    title: "Tell us about yourself",
    description: "What you create, and what makes it worth following.",
  },
  {
    title: "Your niches",
    description: "The topics you create about most.",
  },
  {
    title: "Languages you create in",
    description: "So businesses can match campaigns to your audience.",
  },
  {
    title: "Content types",
    description: "The formats you make — reels, long-form, podcasts…",
  },
  {
    title: "Link your social accounts",
    description: "Add the platforms you're active on.",
  },
  {
    title: "How do you want to collaborate?",
    description: "Pick everything you're open to.",
  },
  {
    title: "Phone number",
    description: "Optional — only shared after you accept a collaboration.",
  },
  {
    title: "Review your profile",
    description: "Check everything over, then finish setup.",
  },
];

interface OnboardingWizardProps {
  profile: Profile;
  initialStep: number;
  initialSocialAccounts: SocialAccount[];
  initialValues: OnboardingValues;
}

export function OnboardingWizard({
  profile,
  initialStep,
  initialSocialAccounts,
  initialValues,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  // Set when the user jumps from the review step to fix something:
  // after saving, return straight to the review instead of walking on.
  const [returnTo, setReturnTo] = useState<number | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>(
    initialSocialAccounts,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<OnboardingValues>({ defaultValues: initialValues });
  const meta = STEPS[step - 1] ?? STEPS[0];
  // Live values for the review step (useWatch is compiler-safe,
  // unlike form.watch()).
  const values = useWatch({ control: form.control }) as OnboardingValues;

  function goTo(next: number, options?: { returnTo?: number }) {
    form.clearErrors();
    setActionError(null);
    setReturnTo(options?.returnTo ?? null);
    setStep(next);
  }

  /** Client-side validation of the current step with its Zod schema. */
  function validateStep(target: number): boolean {
    const schema = getStepSchema(target);
    if (!schema) return false;

    const result = schema.safeParse(form.getValues());
    if (result.success) {
      form.clearErrors();
      return true;
    }
    for (const issue of result.error.issues) {
      const key = issue.path.join(".");
      if (key) {
        form.setError(key as FieldPath<OnboardingValues>, {
          type: "manual",
          message: issue.message,
        });
      }
    }
    return false;
  }

  function handleNext() {
    if (step === TOTAL_ONBOARDING_STEPS) {
      // Finish: the action validates completeness server-side and
      // redirects to the dashboard on success.
      setActionError(null);
      startTransition(async () => {
        const state = await completeOnboarding();
        if (!state.ok) setActionError(state.message);
      });
      return;
    }

    setActionError(null);
    if (!validateStep(step)) return;

    const payload = form.getValues();
    const destination = returnTo ?? Math.min(step + 1, TOTAL_ONBOARDING_STEPS);

    startTransition(async () => {
      const state = await saveOnboardingStep({ step, values: payload });
      if (!state.ok) {
        if (!applyFieldErrors(form, state.fieldErrors)) {
          setActionError(state.message);
        }
        return;
      }
      goTo(destination);
    });
  }

  function handleBack() {
    if (step > 1) goTo(step - 1);
  }

  function handleSaveAndExit() {
    setActionError(null);
    // Nothing worth saving on the review step itself.
    if (step === TOTAL_ONBOARDING_STEPS) {
      router.push("/creator/discover");
      return;
    }
    if (!validateStep(step)) return; // show what's incomplete, then decide

    const payload = form.getValues();
    startTransition(async () => {
      const state = await saveOnboardingStep({ step, values: payload });
      if (!state.ok) {
        // Stay on the step — don't discard a draft we failed to save.
        if (!applyFieldErrors(form, state.fieldErrors)) {
          setActionError(state.message);
        }
        return;
      }
      router.push("/creator/discover");
    });
  }

  const progressPercent = Math.round((step / TOTAL_ONBOARDING_STEPS) * 100);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium text-foreground">
          Step {step} of {TOTAL_ONBOARDING_STEPS}
        </span>
        <button
          type="button"
          onClick={handleSaveAndExit}
          disabled={isPending}
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
        >
          Save &amp; exit
        </button>
      </div>

      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Onboarding progress"
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

      {actionError ? (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Could not save</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-[0_18px_40px_color-mix(in_srgb,var(--foreground)_5%,transparent)] sm:p-6">
        {step === 9 ? (
          <SocialAccountsStep
            accounts={socialAccounts}
            onChange={setSocialAccounts}
          />
        ) : step === TOTAL_ONBOARDING_STEPS ? (
          <ReviewStep
            values={values}
            profile={profile}
            socialAccounts={socialAccounts}
            onEdit={(target) => goTo(target, { returnTo: TOTAL_ONBOARDING_STEPS })}
          />
        ) : (
          <Form {...form}>
            <div className="grid gap-6">
              <StepFields step={step} form={form} />
            </div>
          </Form>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={isPending || step === 1}
        >
          <ArrowLeftIcon />
          Back
        </Button>
        <Button
          type="button"
          onClick={handleNext}
          disabled={isPending}
          className="min-w-32"
        >
          {isPending ? (
            <>
              <Loader2Icon className="animate-spin" />
              Saving…
            </>
          ) : step === TOTAL_ONBOARDING_STEPS ? (
            "Finish setup"
          ) : (
            <>
              Next
              <ArrowRightIcon />
            </>
          )}
        </Button>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Your progress is saved as you go — leave and come back any time.{" "}
        <Link
          href="/creator/discover"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          Go to discovery
        </Link>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------
// Step 12 — review
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

        <ReviewSection title="Niches" editStep={6} onEdit={onEdit}>
          {tags(values.niches)}
        </ReviewSection>

        <ReviewSection title="Languages" editStep={7} onEdit={onEdit}>
          {tags(values.languages)}
        </ReviewSection>

        <ReviewSection title="Content types" editStep={8} onEdit={onEdit}>
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
                    {account.verification_status}
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
