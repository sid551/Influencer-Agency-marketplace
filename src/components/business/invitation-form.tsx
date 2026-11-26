"use client";

import { useActionState, useState } from "react";
import { Loader2Icon } from "lucide-react";

import { sendInvitationAction } from "@/app/business/invitations/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CreatorDirectoryEntry } from "@/types/creator.types";
import { EMPTY_FORM_STATE } from "@/types/action-state.types";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function creatorLabel(creator: CreatorDirectoryEntry): string {
  const name = creator.full_name ?? creator.username ?? "Creator";
  const handle = creator.username ? ` (@${creator.username})` : "";
  const niches = creator.niches.length > 0 ? ` · ${creator.niches.join(", ")}` : "";
  return `${name}${handle}${niches}`;
}

export function InvitationForm({
  creators,
  campaigns,
}: {
  creators: CreatorDirectoryEntry[];
  campaigns: { id: string; title: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    sendInvitationAction,
    EMPTY_FORM_STATE,
  );
  const [query, setQuery] = useState("");
  const [creatorId, setCreatorId] = useState("");

  const needle = query.trim().toLowerCase();
  const visibleCreators = creators.filter((creator) => {
    if (!needle || creator.profile_id === creatorId) return true;
    const haystack = [
      creator.full_name,
      creator.username,
      creator.city,
      creator.state,
      ...creator.niches,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      {!state.ok && state.message ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-2">
        <label htmlFor="creator_search" className="text-sm font-medium">
          Find a creator
        </label>
        <Input
          id="creator_search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, handle, location or niche"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="creator_profile_id" className="text-sm font-medium">
          Creator
        </label>
        <select
          id="creator_profile_id"
          name="creator_profile_id"
          className={selectClass}
          value={creatorId}
          onChange={(event) => setCreatorId(event.target.value)}
          aria-invalid={!!state.fieldErrors.creator_profile_id}
          required
        >
          <option value="">Choose a creator…</option>
          {visibleCreators.map((creator) => (
            <option key={creator.profile_id} value={creator.profile_id}>
              {creatorLabel(creator)}
            </option>
          ))}
        </select>
        <FieldError messages={state.fieldErrors.creator_profile_id} />
        {creators.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No creators have set up a profile yet.
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <label htmlFor="campaign_id" className="text-sm font-medium">
          Campaign <span className="text-muted-foreground">(optional)</span>
        </label>
        <select
          id="campaign_id"
          name="campaign_id"
          className={selectClass}
          defaultValue=""
          aria-invalid={!!state.fieldErrors.campaign_id}
        >
          <option value="">No specific campaign</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.title}
            </option>
          ))}
        </select>
        <FieldError messages={state.fieldErrors.campaign_id} />
      </div>

      <div className="grid gap-2">
        <label htmlFor="message" className="text-sm font-medium">Message</label>
        <Textarea
          id="message"
          name="message"
          rows={5}
          placeholder="Tell the creator why you'd like to work together…"
          aria-invalid={!!state.fieldErrors.message}
          required
        />
        <FieldError messages={state.fieldErrors.message} />
      </div>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? (
          <>
            <Loader2Icon className="animate-spin" />
            Sending…
          </>
        ) : (
          "Send invitation"
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
