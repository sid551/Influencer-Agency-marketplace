"use client";

import type { UseFormReturn, FieldPath } from "react-hook-form";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CONTENT_TYPE_OPTIONS,
  LANGUAGE_OPTIONS,
  NICHE_OPTIONS,
  COLLABORATION_PREFERENCES,
} from "@/types/creator.types";
import { cn } from "cn";
import type { OnboardingValues } from "@/lib/validations/onboarding";

type WizardForm = UseFormReturn<OnboardingValues>;

/**
 * Field renderers for wizard steps 1–8, 10 and 11. Step 9 (social
 * accounts) and step 12 (review) live in their own components.
 */
export function StepFields({ step, form }: { step: number; form: WizardForm }) {
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
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input autoComplete="address-level2" placeholder="Mumbai" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State / region</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="address-level1"
                    placeholder="Maharashtra"
                    {...field}
                  />
                </FormControl>
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
      return (
        <MultiCheckboxField
          form={form}
          name="niches"
          label="Your niches"
          hint="Pick up to 5 topics you create about."
          options={NICHE_OPTIONS}
          max={5}
        />
      );

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
                  <span className="capitalize leading-tight">
                    {option.replace(/_/g, " ")}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {field.value.length}/{max} selected
          </p>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
