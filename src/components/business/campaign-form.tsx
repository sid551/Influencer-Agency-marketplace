"use client";

import {
  useActionState,
  useEffect,
  useState,
  type ChangeEvent,
} from "react";
import Image from "next/image";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CampaignFormDefaults } from "@/lib/campaign-form-defaults";
import {
  SIMPLE_CAMPAIGN_STATUS_HELP,
  SIMPLE_CAMPAIGN_STATUSES,
  campaignStatusValueForChoice,
  label,
  simpleCampaignStatus,
  simpleCampaignStatusLabel,
  type SimpleCampaignStatus,
} from "@/lib/labels";
import {
  CAMPAIGN_IMAGE_ACCEPT,
  CAMPAIGN_IMAGE_ALT_MAX,
  CAMPAIGN_IMAGE_MAX_BYTES,
} from "@/lib/validations/campaign-image";
import { CAMPAIGN_PLATFORMS } from "@/lib/validations/business";
import { NICHE_OPTIONS } from "@/types/creator.types";
import { COLLABORATION_TYPES } from "@/types/campaign.types";
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    defaultValues.image_url,
  );
  const [removeImage, setRemoveImage] = useState(false);
  const [statusChoice, setStatusChoice] = useState<SimpleCampaignStatus>(
    simpleCampaignStatus(defaultValues.status),
  );

  useEffect(() => {
    if (!previewUrl?.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setRemoveImage(false);
    setPreviewUrl(
      file ? URL.createObjectURL(file) : (defaultValues.image_url ?? null),
    );
  }

  return (
    <form
      action={formAction}
      encType="multipart/form-data"
      className="grid gap-5"
      noValidate
    >
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

      <div className="grid gap-3 rounded-2xl border border-border bg-card/60 p-4">
        <div className="grid gap-2">
          <label htmlFor="campaign_image" className="text-sm font-medium">
            Campaign photo (optional)
          </label>
          <Input
            id="campaign_image"
            name="campaign_image"
            type="file"
            accept={CAMPAIGN_IMAGE_ACCEPT}
            onChange={handleImageChange}
            className="cursor-pointer"
            aria-describedby="campaign-image-hint"
          />
          <p id="campaign-image-hint" className="text-xs text-muted-foreground">
            JPEG, PNG or WebP up to {Math.round(CAMPAIGN_IMAGE_MAX_BYTES / 1024 / 1024)} MB.
            Uploaded to Cloudinary and shown to creators.
          </p>
          <FieldError messages={state.fieldErrors.campaign_image} />
        </div>

        <div className="grid gap-2">
          <label htmlFor="image_alt" className="text-sm font-medium">
            Image description (optional)
          </label>
          <Input
            id="image_alt"
            name="image_alt"
            defaultValue={defaultValues.image_alt}
            maxLength={CAMPAIGN_IMAGE_ALT_MAX}
            placeholder="e.g. The summer collection being photographed"
          />
          <p className="text-xs text-muted-foreground">
            Helps describe the photo for creators using screen readers.
          </p>
          <FieldError messages={state.fieldErrors.image_alt} />
        </div>

        {previewUrl && !removeImage ? (
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-border bg-muted">
            <Image
              src={previewUrl}
              alt={defaultValues.image_alt || `${defaultValues.title || "Campaign"} photo`}
              fill
              sizes="(max-width: 768px) 100vw, 640px"
              className="object-cover"
              unoptimized={previewUrl.startsWith("blob:")}
            />
          </div>
        ) : null}

        {editing && defaultValues.image_url ? (
          <label className="flex w-fit items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="remove_image"
              value="true"
              checked={removeImage}
              onChange={(event) => setRemoveImage(event.target.checked)}
              className="size-4 accent-primary"
            />
            Remove current photo
          </label>
        ) : null}
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
          <label htmlFor="status" className="text-sm font-medium">Campaign state</label>
          <select
            id="status"
            name="status_choice"
            className={selectClass}
            value={statusChoice}
            onChange={(event) =>
              setStatusChoice(event.target.value as SimpleCampaignStatus)
            }
          >
            {(editing
              ? SIMPLE_CAMPAIGN_STATUSES
              : (["draft", "live"] as const)
            ).map((status) => (
              <option key={status} value={status}>
                {simpleCampaignStatusLabel(status)}
              </option>
            ))}
          </select>
          <input
            type="hidden"
            name="status"
            value={campaignStatusValueForChoice(
              statusChoice,
              defaultValues.status,
            )}
            readOnly
          />
          <p className="text-xs text-muted-foreground">
            {SIMPLE_CAMPAIGN_STATUS_HELP[statusChoice]}
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
