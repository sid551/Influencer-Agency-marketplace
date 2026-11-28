"use client";

import type { UseFormReturn, FieldPath } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { useMemo } from "react";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CONTENT_TYPE_OPTIONS,
  LANGUAGE_OPTIONS,
  NICHE_OPTIONS,
  COLLABORATION_PREFERENCES,
} from "@/types/creator.types";
import { citiesForState, INDIAN_STATES } from "@/lib/locations";
import { cn } from "cn";
import { label as labelFor } from "@/lib/labels";
import type { OnboardingValues } from "@/lib/validations/onboarding";

type WizardForm = UseFormReturn<OnboardingValues>;

/**
 * Field renderers for wizard steps 1–8, 10 and 11. Step 9 (social
 * accounts) and step 12 (review) live in their own components.
 */
export function StepFields({ step, form }: { step: number; form: WizardForm }) {
  // Drives the location step: the city list follows the chosen state.
  const selectedState = useWatch({ control: form.control, name: "state" });
  const cityOptions = useMemo(() => citiesForState(selectedState), [selectedState]);

  switch (step) {
    case 1:
      return (
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  placeholder="The name you go by"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Shown on your profile and to businesses.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case 2:
      return (
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  autoComplete="username"
                  placeholder="your_handle"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                3–30 letters, numbers or underscores. This is your public
                handle and can&apos;t be changed often.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case 3:
      return (
        <FormField
          control={form.control}
          name="avatarUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profile photo</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://example.com/your-photo.jpg"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Paste a direct link to a square image (JPG or PNG). You can
                skip this and add it later.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case 4:
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl>
                  <Combobox
                    value={field.value ?? ""}
                    onChange={(next) => {
                      field.onChange(next);
                      // A city from the old state no longer applies —
                      // clear it so the pair always stays consistent.
                      const currentCity = form.getValues("city");
                      if (
                        currentCity &&
                        !citiesForState(next).includes(currentCity)
                      ) {
                        form.setValue("city", "", { shouldDirty: true });
                      }
                    }}
                    options={INDIAN_STATES}
                    allowCustomValue
                    placeholder="Search your state…"
                    searchPlaceholder="Search states"
                    emptyMessage="No state matches that."
                  />
                </FormControl>
                <FormDescription>
                  Start typing to filter — every state and union territory.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Combobox
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    options={cityOptions}
                    allowCustomValue
                    disabled={!selectedState}
                    placeholder={
                      selectedState ? "Search your city…" : "Pick a state first"
                    }
                    searchPlaceholder="Search cities"
                    emptyMessage="No city matches — type it below."
                  />
                </FormControl>
                <FormDescription>
                  {selectedState
                    ? `Cities in ${selectedState}. Don't see yours? Type it.`
                    : "Choose your state first — the city list follows it."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      );

    case 5:
      return (
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>About you</FormLabel>
              <FormControl>
                <Textarea
                  rows={6}
                  placeholder="What you create, who you create it for, and what makes your content distinctive…"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {field.value.length}/1000 characters (60 minimum).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case 6:
      return <NicheFields form={form} />;

    case 7:
      return (
        <MultiCheckboxField
          form={form}
          name="languages"
          label="Languages"
          hint="Languages you create in. Pick up to 6."
          options={LANGUAGE_OPTIONS}
          max={6}
        />
      );

    case 8:
      return (
        <MultiCheckboxField
          form={form}
          name="contentTypes"
          label="Content types"
          hint="Formats you make. Pick up to 6."
          options={CONTENT_TYPE_OPTIONS}
          max={6}
        />
      );

    case 10:
      return (
        <MultiCheckboxField
          form={form}
          name="collaborationPreferences"
          label="Open to"
          hint="How you'd like to work with businesses."
          options={COLLABORATION_PREFERENCES}
          max={4}
          columns={2}
        />
      );

    case 11:
      return (
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone (optional)</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Only shared with businesses after you accept a collaboration.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    default:
      return null;
  }
}

const FIELD_LABELS: Partial<Record<FieldPath<OnboardingValues>, string>> = {
  fullName: "Full name",
  username: "Username",
  avatarUrl: "Profile photo",
  city: "City",
  state: "State / region",
  bio: "About you",
  niches: "Niches",
  primaryNiche: "Primary niche",
  languages: "Languages",
  contentTypes: "Content types",
  collaborationPreferences: "Open to",
  phone: "Phone",
};

/** Applies server-side (action) field errors to the wizard form. */
export function applyFieldErrors(
  form: WizardForm,
  fieldErrors: Record<string, string[]>,
): boolean {
  let applied = false;
  for (const [name, messages] of Object.entries(fieldErrors)) {
    const key = name as FieldPath<OnboardingValues>;
    if (messages?.[0] && key in FIELD_LABELS) {
      form.setError(key, { type: "server", message: messages[0] });
      applied = true;
    }
  }
  return applied;
}

interface MultiCheckboxFieldProps {
  form: WizardForm;
  name: "niches" | "languages" | "contentTypes" | "collaborationPreferences";
  label: string;
  hint: string;
  options: readonly string[];
  max: number;
  columns?: 2 | 3;
}

function MultiCheckboxField({
  form,
  name,
  label,
  hint,
  options,
  max,
  columns = 3,
}: MultiCheckboxFieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormDescription>{hint}</FormDescription>
          <div
            className={cn(
              "grid gap-2",
              columns === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3",
            )}
          >
            {options.map((option) => {
              const checked = field.value.includes(option);
              const atLimit = !checked && field.value.length >= max;
              return (
                <label
                  key={option}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-2xl border p-2.5 text-sm transition-colors",
                    "hover:bg-muted",
                    checked
                      ? "border-primary bg-primary/5"
                      : "border-border",
                    atLimit && "cursor-not-allowed opacity-50",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    disabled={atLimit}
                    onCheckedChange={(value) => {
                      if (value === true) {
                        field.onChange([...field.value, option]);
                      } else {
                        field.onChange(
                          field.value.filter((item) => item !== option),
                        );
                      }
                    }}
                  />
                  <span className="leading-tight">{labelFor(option)}</span>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {field.value.length}/{max} selected
            {field.value.length >= max
              ? " — unselect one to choose a different option"
              : ""}
          </p>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/**
 * Step 6: multiple niches with exactly one primary. The primary picker
 * only offers niches that are already selected; removing the current
 * primary promotes the first remaining niche (no setState-in-effect).
 */
function NicheFields({ form }: { form: WizardForm }) {
  const niches = useWatch({ control: form.control, name: "niches" });
  const currentPrimary = useWatch({ control: form.control, name: "primaryNiche" });

  function toggleNiche(slug: string, checked: boolean) {
    const next = checked
      ? [...niches.filter((item) => item !== slug), slug]
      : niches.filter((item) => item !== slug);

    form.setValue("niches", next, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (!next.includes(currentPrimary as string)) {
      form.setValue("primaryNiche", (next[0] ?? "") as typeof currentPrimary, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }

  return (
    <div className="grid gap-5">
      <FormField
        control={form.control}
        name="niches"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Your niches</FormLabel>
            <FormDescription>
              Pick up to 5 topics you create about. Choose one as your primary
              niche below — it carries the strongest weight in recommendations.
            </FormDescription>
            <div className="grid gap-2 sm:grid-cols-3">
              {NICHE_OPTIONS.map((option) => {
                const checked = field.value.includes(option);
                const atLimit = !checked && field.value.length >= 5;
                return (
                  <label
                    key={option}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-2xl border p-2.5 text-sm transition-colors",
                      "hover:bg-muted",
                      checked ? "border-primary bg-primary/5" : "border-border",
                      atLimit && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={atLimit}
                      onCheckedChange={(value) => toggleNiche(option, value === true)}
                    />
                    <span className="leading-tight">{labelFor(option)}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {field.value.length}/5 selected
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="primaryNiche"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Primary niche</FormLabel>
            <FormDescription>
              Your main category. It must be one of the niches selected above.
            </FormDescription>
            <Select
              value={field.value || undefined}
              onValueChange={field.onChange}
              disabled={niches.length === 0}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose your primary niche" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {niches.map((slug) => (
                  <SelectItem key={slug} value={slug}>
                    {labelFor(slug)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
