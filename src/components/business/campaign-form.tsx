"use client";

import { useActionState } from "react";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CampaignFormDefaults } from "@/lib/campaign-form-defaults";
import { label } from "@/lib/labels";
import {
  CAMPAIGN_PLATFORMS,
} from "@/lib/validations/business";
import { NICHE_OPTIONS } from "@/types/creator.types";
import {
  CAMPAIGN_STATUSES,
  COLLABORATION_TYPES,
} from "@/types/campaign.types";
import {
  EMPTY_FORM_STATE,
  type FormActionState,
} from "@/types/action-state.types";

const selectClass =
  "flex h-9 w-full rounded-xl border border-input bg-card/80 px-3 py-1 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function CampaignForm({
  action,
  defaultValues,
  editing = false,
}: {
  action: (prev: FormActionState, formData: FormData) => Promise<FormActionState>;
  defaultValues: CampaignFormDefaults;
  editing?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      {!state.ok && state.message ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}

      {editing ? (
        <input type="hidden" name="campaignId" value={defaultValues.campaignId} readOnly />
      ) : null}

      <div className="grid gap-2">
        <label htmlFor="title" className="text-sm font-medium">Campaign title</label>
        <Input id="title" name="title" defaultValue={defaultValues.title} required />
        <FieldError messages={state.fieldErrors.title} />
      </div>

      <div className="grid gap-2">
        <label htmlFor="description" className="text-sm font-medium">Description</label>
        <Textarea id="description" name="description" rows={5} defaultValue={defaultValues.description} required />
        <FieldError messages={state.fieldErrors.description} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="category" className="text-sm font-medium">Category</label>
          <Input id="category" name="category" defaultValue={defaultValues.category} placeholder="Fashion" required />
          <FieldError messages={state.fieldErrors.category} />
        </div>
        <div className="grid gap-2">
          <label htmlFor="location" className="text-sm font-medium">Location (optional)</label>
          <Input id="location" name="location" defaultValue={defaultValues.location} placeholder="Remote / New York" />
          <FieldError messages={state.fieldErrors.location} />
        </div>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Platforms</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {CAMPAIGN_PLATFORMS.map((platform) => (
            <label key={platform} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="platforms"
                value={platform}
                defaultChecked={defaultValues.platforms.includes(platform)}
                className="size-4 accent-primary"
              />
              {platform === "x" ? "X" : label(platform)}
            </label>
          ))}
        </div>
        <FieldError messages={state.fieldErrors.platforms} />
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Target niches</legend>
        <p className="text-xs text-muted-foreground">
          Pick 1–5 niches this campaign is aimed at. Creators whose niches
          match will see it higher in their discovery feed.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {NICHE_OPTIONS.map((niche) => (
            <label key={niche} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="target_niches"
                value={niche}
                defaultChecked={defaultValues.target_niches?.includes(niche) ?? false}
                className="size-4 accent-primary"
              />
              {label(niche)}
            </label>
          ))}
        </div>
        <FieldError messages={state.fieldErrors.target_niches} />
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="collaboration_type" className="text-sm font-medium">Collaboration type</label>
          <select id="collaboration_type" name="collaboration_type" className={selectClass} defaultValue={defaultValues.collaboration_type}>
            {COLLABORATION_TYPES.map((type) => (
              <option key={type} value={type}>{label(type)}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Pick the option that best matches how you want to work.
          </p>
          <FieldError messages={state.fieldErrors.collaboration_type} />
        </div>
        <div className="grid gap-2">
          <label htmlFor="status" className="text-sm font-medium">Status</label>
          <select id="status" name="status" className={selectClass} defaultValue={defaultValues.status}>
            {(editing ? CAMPAIGN_STATUSES : (["draft", "published"] as const)).map((status) => (
              <option key={status} value={status}>{label(status)}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Draft: only you can see it. Open for applications: creators can
            find and apply. You can publish later by editing the campaign.
          </p>
          <FieldError messages={state.fieldErrors.status} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="grid gap-2">
          <label htmlFor="budget_min" className="text-sm font-medium">Minimum budget</label>
          <Input id="budget_min" name="budget_min" inputMode="decimal" placeholder="500" defaultValue={defaultValues.budget_min} />
          <FieldError messages={state.fieldErrors.budget_min} />
        </div>
        <div className="grid gap-2">
          <label htmlFor="budget_max" className="text-sm font-medium">Maximum budget</label>
          <Input id="budget_max" name="budget_max" inputMode="decimal" placeholder="1500" defaultValue={defaultValues.budget_max} />
          <FieldError messages={state.fieldErrors.budget_max} />
        </div>
        <div className="grid gap-2">
          <label htmlFor="currency" className="text-sm font-medium">Currency</label>
          <Input id="currency" name="currency" defaultValue={defaultValues.currency} readOnly />
          <FieldError messages={state.fieldErrors.currency} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Budget is optional — leave both amounts blank if you&apos;d rather agree
        on price with creators. Currency is set to your account default.
      </p>

      <div className="grid gap-2">
        <label htmlFor="deliverables" className="text-sm font-medium">Deliverables (in your brief)</label>
        <Textarea
          id="deliverables"
          name="deliverables"
          rows={4}
          defaultValue={defaultValues.deliverables}
          placeholder={"1 short-form video\n1 Instagram story set"}
        />
        <p className="text-xs text-muted-foreground">
          One deliverable per line. This is your wish list — you&apos;ll agree on
          final deliverables with the creator you choose.
        </p>
        <FieldError messages={state.fieldErrors.deliverables} />
      </div>

      <div className="grid gap-2">
        <label htmlFor="application_deadline" className="text-sm font-medium">Application deadline (optional)</label>
        <Input id="application_deadline" name="application_deadline" type="date" defaultValue={defaultValues.application_deadline} />
        <FieldError messages={state.fieldErrors.application_deadline} />
      </div>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? (
          <>
            <Loader2Icon className="animate-spin" />
            Saving…
          </>
        ) : editing ? (
          "Save changes"
        ) : (
          "Create campaign"
        )}
      </Button>
    </form>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {messages[0]}
    </p>
  );
}
