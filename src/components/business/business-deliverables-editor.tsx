"use client";

import {
  useActionState,
  useEffect,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";

import { saveBusinessDeliverablesAction } from "@/app/business/collaborations/actions";
import type { FormActionState } from "@/types/action-state.types";
import type { BusinessDeliverableDraftValues } from "@/lib/validations/business";
import type { Deliverable } from "@/types/collaboration.types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const EMPTY_STATE: FormActionState = {
  ok: false,
  message: null,
  fieldErrors: {},
};

const MAX_DELIVERABLES = 25;

function toDraft(deliverable: Deliverable): BusinessDeliverableDraftValues {
  return {
    id: deliverable.id,
    title: deliverable.title,
    due_date: deliverable.due_date,
  };
}

/** Negotiation-only editor for the agreed deliverable list. */
export function BusinessDeliverablesEditor({
  collaborationId,
  deliverables,
}: {
  collaborationId: string;
  deliverables: Deliverable[];
}) {
  const [items, setItems] = useState<BusinessDeliverableDraftValues[]>(() =>
    deliverables.map(toDraft),
  );
  const [state, formAction, isPending] = useActionState(
    saveBusinessDeliverablesAction.bind(null, collaborationId),
    EMPTY_STATE,
  );
  const [, startTransition] = useTransition();

  const fieldError = Object.values(state.fieldErrors).flat()[0] ?? null;
  const errorMessage = state.message ?? fieldError;
  useEffect(() => {
    if (!errorMessage) return;
    if (state.ok) toast.success(errorMessage);
    else toast.error(errorMessage);
  }, [errorMessage, state.ok]);

  function addDeliverable() {
    setItems((current) => [
      ...current,
      { id: crypto.randomUUID(), title: "", due_date: null },
    ]);
  }

  function updateItem(
    id: string,
    changes: Partial<BusinessDeliverableDraftValues>,
  ) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set(
      "deliverables",
      JSON.stringify(
        items.map((item) => ({
          id: item.id,
          title: item.title.trim(),
          due_date: item.due_date,
        })),
      ),
    );
    startTransition(async () => {
      await formAction(formData);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agreed deliverables</CardTitle>
        <CardDescription>
          Add what the creator should deliver. The creator submits each item
          for your review after the agreement becomes active.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="mb-4 text-sm text-muted-foreground">
            No deliverables yet. Add at least one before sending the agreement.
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="grid gap-3" noValidate>
          {items.map((item, index) => (
            <div
              key={item.id}
              className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_180px_auto]"
            >
              <div className="grid gap-1">
                <label
                  htmlFor={`deliverable-title-${item.id}`}
                  className="text-xs text-muted-foreground"
                >
                  Deliverable {index + 1}
                </label>
                <Input
                  id={`deliverable-title-${item.id}`}
                  value={item.title}
                  maxLength={200}
                  placeholder="e.g. Instagram reel"
                  disabled={isPending}
                  onChange={(event) =>
                    updateItem(item.id, { title: event.target.value })
                  }
                />
              </div>
              <div className="grid gap-1">
                <label
                  htmlFor={`deliverable-date-${item.id}`}
                  className="text-xs text-muted-foreground"
                >
                  Due date (optional)
                </label>
                <Input
                  id={`deliverable-date-${item.id}`}
                  type="date"
                  value={item.due_date ?? ""}
                  disabled={isPending}
                  onChange={(event) =>
                    updateItem(item.id, { due_date: event.target.value || null })
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="self-end text-muted-foreground hover:text-destructive"
                aria-label={`Remove deliverable ${index + 1}`}
                disabled={isPending}
                onClick={() =>
                  setItems((current) =>
                    current.filter((entry) => entry.id !== item.id),
                  )
                }
              >
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending || items.length >= MAX_DELIVERABLES}
              onClick={addDeliverable}
            >
              <PlusIcon className="size-4" />
              Add deliverable
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Save deliverables
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
