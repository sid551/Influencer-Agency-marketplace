"use client";

import { useActionState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import * as z from "zod";

import { applyToCampaign } from "@/app/creator/applications/actions";
import { DEFAULT_CURRENCY } from "@/lib/money";
import { currencySchema } from "@/lib/validations/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";

const applicationFormSchema = z.object({
  proposal: z.string().trim().min(50, { error: "Your proposal must be at least 50 characters." }).max(2000, { error: "Proposal must be 2,000 characters or fewer." }),
  why_suitable: z.string().trim().max(1000, { error: "Why suitable must be 1,000 characters or fewer." }),
  expected_price: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, { error: "Enter a valid price with up to two decimal places." }),
  currency: currencySchema,
});

type ApplicationFormValues = z.infer<typeof applicationFormSchema>;

export function ApplyToCampaignForm({ campaignId }: { campaignId: string }) {
  const [state, formAction, isPending] = useActionState(
    applyToCampaign.bind(null, campaignId),
    { ok: false, message: null, fieldErrors: {} },
  );
  const [, startTransition] = useTransition();

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      proposal: "",
      why_suitable: "",
      expected_price: "",
      currency: DEFAULT_CURRENCY,
    },
  });

  function onSubmit(values: ApplicationFormValues) {
    const formData = new FormData();
    formData.append("proposal", values.proposal);
    formData.append("why_suitable", values.why_suitable);
    formData.append("expected_price", values.expected_price);
    formData.append("currency", values.currency);
    startTransition(async () => {
      await formAction(formData);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apply</CardTitle>
        <CardDescription>
          Submit a proposal to collaborate on this campaign.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
            {state.message ? (
              <p className="text-sm text-destructive" role="status">
                {state.message}
              </p>
            ) : null}

            <FormField
              control={form.control}
              name="proposal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proposal</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe how you would approach this campaign…"
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Explain your idea, deliverables, and timeline (50+ chars).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="why_suitable"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Why you&apos;re a fit (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share relevant audience or past work…"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="expected_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected price</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="500.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Input placeholder="INR" {...field} readOnly />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Submit application
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
