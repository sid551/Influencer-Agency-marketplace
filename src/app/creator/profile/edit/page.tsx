"use client";

import { useActionState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Loader2Icon } from "lucide-react";

import {
  updateProfile,
} from "./actions";
import {
  profileEditSchema,
  type ProfileEditValues,
} from "@/lib/validations/profile";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfileEditPage() {
  const [state, formAction, isPending] = useActionState(updateProfile, {
    ok: false,
    message: null,
    fieldErrors: {},
  });
  const [isSubmitting, startTransition] = useTransition();

  const form = useForm<ProfileEditValues>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      fullName: "",
      username: "",
      avatarUrl: "",
      city: "",
      state: "",
      phone: "",
    },
  });

  function onSubmit(values: ProfileEditValues) {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("fullName", values.fullName);
      formData.append("username", values.username);
      formData.append("avatarUrl", values.avatarUrl ?? "");
      formData.append("city", values.city ?? "");
      formData.append("state", values.state ?? "");
      formData.append("phone", values.phone ?? "");
      await formAction(formData);
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Edit profile
          </h1>
          <p className="text-sm text-muted-foreground">
            Update your public profile details.
          </p>
        </div>
        <Link
          href="/creator/profile"
          className="text-sm text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
        >
          ← Back to profile
        </Link>
      </div>

      {state.message && state.ok && (
        <Alert className="mt-6">
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {!state.ok && state.message && (
        <Alert variant="destructive" className="mt-6">
          <AlertTitle>Could not save</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-8 grid gap-6"
          noValidate
        >
          <Card>
            <CardHeader>
              <CardTitle>Basic details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="name"
                        placeholder="Your full name"
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
                      handle.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profile photo URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://example.com/photo.jpg"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      A direct link to a square image (JPG or PNG). Leave blank
                      to use your initials.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="address-level2"
                        placeholder="Mumbai"
                        {...field}
                      />
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent>
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
                      Only shared with businesses after you accept a
                      collaboration.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="outline" asChild>
              <Link href="/creator/profile">Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={isPending || isSubmitting}
              className="min-w-32"
            >
              {isPending || isSubmitting ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  Save changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
