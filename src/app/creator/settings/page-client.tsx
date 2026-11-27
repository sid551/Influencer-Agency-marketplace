"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon, Loader2Icon, UnplugIcon } from "lucide-react";

import {
  addSocialAccountAction,
  disconnectInstagramAction,
  removeSocialAccountAction,
} from "./actions";
import { verificationStatusLabel } from "@/lib/labels";
import { socialAccountSchema } from "@/lib/validations/onboarding";
import { SOCIAL_PLATFORMS } from "@/types/creator.types";
import type { SocialAccount } from "@/types/creator.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  other: "Other",
};

export function SocialAccountsList({
  accounts,
}: {
  accounts: SocialAccount[];
}) {
  return (
    <ul className="grid gap-2">
      {accounts.map((account) => (
        <li
          key={account.id}
          className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-3 py-2.5"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {PLATFORM_LABELS[account.platform] ?? account.platform}
              <span className="ml-2 font-normal text-muted-foreground">
                @{account.username}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {verificationStatusLabel(account.verification_status)}
            </Badge>
            <DeleteSocialAccountForm accountId={account.id} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function DeleteSocialAccountForm({
  accountId,
}: {
  accountId: string;
}) {
  const router = useRouter();
  const [state, deleteAction, isPending] = useActionState(
    removeSocialAccountAction,
    { ok: false, message: null, fieldErrors: {} },
  );
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || (!state.ok && !state.message)) return;
    handled.current = true;
    if (state.ok) {
      toast.success("Account removed");
      router.refresh();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state.ok, state.message, router]);

  function handleRemove() {
    if (!window.confirm("Remove this social account from your profile?")) return;
    const formData = new FormData();
    formData.append("accountId", accountId);
    deleteAction(formData);
  }

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={handleRemove}
      disabled={isPending}
      aria-label="Remove social account"
    >
      {isPending ? (
        <Loader2Icon className="animate-spin size-4" />
      ) : (
        <Trash2Icon className="size-4" />
      )}
    </Button>
  );
}

export function InstagramDisconnectButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDisconnect() {
    if (
      !window.confirm(
        "Disconnect Instagram? This removes the verified account and its access token.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const state = await disconnectInstagramAction();
      if (state.ok) {
        toast.success("Instagram disconnected");
        router.refresh();
      } else {
        toast.error(state.message ?? "Could not disconnect Instagram.");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleDisconnect}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2Icon className="animate-spin" />
      ) : (
        <UnplugIcon />
      )}
      Disconnect
    </Button>
  );
}

export function AddSocialAccountForm() {
  const router = useRouter();
  const [state, addAction, isPending] = useActionState(
    addSocialAccountAction,
    { ok: false, message: null, fieldErrors: {} },
  );
  const [isSubmitting, startTransition] = useTransition();
  const handled = useRef("");
  const errorsApplied = useRef("");

  const form = useForm<{
    platform: string;
    username: string;
  }>({
    resolver: zodResolver(socialAccountSchema),
    defaultValues: { platform: "instagram", username: "" },
  });

  useEffect(() => {
    const key = JSON.stringify(state.fieldErrors);
    if (key === errorsApplied.current) return;
    errorsApplied.current = key;
    for (const [name, messages] of Object.entries(state.fieldErrors)) {
      if (messages?.[0]) {
        form.setError(name as "platform" | "username", {
          type: "server",
          message: messages[0],
        });
      }
    }
  }, [state.fieldErrors, form]);

  useEffect(() => {
    const key = `${state.ok}:${state.message ?? ""}`;
    if (key === handled.current || (!state.ok && !state.message)) return;
    handled.current = key;
    if (state.ok) {
      toast.success("Account added");
      form.reset({ platform: "instagram", username: "" });
      router.refresh();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state.ok, state.message, form, router]);

  function onSubmit(values: { platform: string; username: string }) {
    const formData = new FormData();
    formData.append("platform", values.platform);
    formData.append("username", values.username);
    startTransition(async () => {
      await addAction(formData);
    });
  }

  return (
    <div className="mt-4">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-4 sm:grid-cols-2 items-end"
          noValidate
        >
          <FormField
            control={form.control}
            name="platform"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Platform</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a platform" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SOCIAL_PLATFORMS.map((platform) => (
                        <SelectItem key={platform} value={platform}>
                          {PLATFORM_LABELS[platform] ?? platform}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="your_handle" {...field} />
                </FormControl>
                <FormDescription>
                  Use the handle exactly as it appears — no leading @.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="col-span-2 flex justify-end">
            <Button
              type="submit"
              disabled={isPending || isSubmitting}
            >
              {isPending || isSubmitting ? (
                <>
                  <Loader2Icon className="animate-spin size-4 shrink-0" />
                  Adding…
                </>
              ) : (
                <>
                  <PlusIcon className="size-4 shrink-0" />
                  Add account
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
