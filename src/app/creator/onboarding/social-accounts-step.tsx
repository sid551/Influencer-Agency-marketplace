"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, PlusIcon, XIcon } from "lucide-react";

import {
  addSocialAccount,
  removeSocialAccount,
} from "@/app/creator/onboarding/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { socialAccountSchema } from "@/lib/validations/onboarding";
import { SOCIAL_PLATFORMS } from "@/types/creator.types";
import type { SocialAccount } from "@/types/creator.types";
import type * as z from "zod";

type AddValues = z.output<typeof socialAccountSchema>;

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  tiktok: "TikTok",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  other: "Other",
};

interface SocialAccountsStepProps {
  accounts: SocialAccount[];
  onChange: (accounts: SocialAccount[]) => void;
}

/**
 * Onboarding step 9. Accounts are saved through their own actions so
 * the list updates immediately; the wizard marks the step complete
 * when the user presses Next. Every account starts as "unverified".
 */
export function SocialAccountsStep({
  accounts,
  onChange,
}: SocialAccountsStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<AddValues>({
    resolver: zodResolver(socialAccountSchema),
    defaultValues: { platform: "instagram", username: "" },
  });

  function handleAdd(values: AddValues) {
    setError(null);
    startTransition(async () => {
      const state = await addSocialAccount(values);
      if (!state.ok) {
        if (Object.keys(state.fieldErrors).length > 0) {
          for (const [name, messages] of Object.entries(state.fieldErrors)) {
            if (messages?.[0]) {
              form.setError(name as keyof AddValues, {
                type: "server",
                message: messages[0],
              });
            }
          }
        } else {
          setError(state.message);
        }
        return;
      }
      if (state.account) {
        onChange([state.account, ...accounts]);
      }
      form.reset({ platform: "instagram", username: "" });
    });
  }

  function handleRemove(accountId: string) {
    setError(null);
    startTransition(async () => {
      const state = await removeSocialAccount({ accountId });
      if (!state.ok) {
        setError(state.message);
        return;
      }
      onChange(accounts.filter((account) => account.id !== accountId));
    });
  }

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-base font-medium">Your social accounts</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Link the accounts you create on. They stay marked{" "}
          <span className="font-medium text-foreground">unverified</span>{" "}
          until a manual review confirms ownership — we never claim
          verification we haven&apos;t done.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not save</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {accounts.length > 0 ? (
        <ul className="grid gap-2">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
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
                  {account.verification_status}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${account.username}`}
                  disabled={isPending}
                  onClick={() => handleRemove(account.id)}
                >
                  <XIcon />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          No accounts linked yet — add at least one below (you can skip
          this step too).
        </p>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleAdd)}
          className="grid gap-4 rounded-lg border border-border bg-muted/30 p-4"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="platform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Platform</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
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
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormDescription>
            Use the handle exactly as it appears on the platform — no
            leading @.
          </FormDescription>

          <Button type="submit" disabled={isPending} className="justify-self-start">
            {isPending ? (
              <>
                <Loader2Icon className="animate-spin" />
                Adding…
              </>
            ) : (
              <>
                <PlusIcon />
                Add account
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
