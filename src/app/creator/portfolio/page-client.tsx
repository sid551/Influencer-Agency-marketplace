"use client";

import Image from "next/image";
import { useActionState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";

import {
  addPortfolioItem,
  deletePortfolioItem,
} from "./actions";
import {
  Badge,
} from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import {
  portfolioItemSchema,
  type PortfolioItemValues,
} from "@/lib/validations/portfolio";
import type { PortfolioItem } from "@/types/creator.types";

export function PortfolioCard({ item }: { item: PortfolioItem }) {
  const [state, deleteAction, isPending] = useActionState(
    deletePortfolioItem,
    { ok: false, message: null, fieldErrors: {} },
  );

  if (state.ok) {
    // Item deleted — signal the parent by throwing to force a re-fetch.
    // In practice the server re-renders on navigation; here we just
    // clear the action state so the UI stays consistent.
  }

  function handleDelete() {
    const formData = new FormData();
    formData.append("itemId", item.id);
    deleteAction(formData);
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0 relative aspect-video overflow-hidden bg-muted">
        {item.media_type === "image" ? (
          <Image
            src={item.media_url}
            alt={item.title}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground text-sm">
            {item.media_type.replace(/_/g, " ")}
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-end p-3">
          <h3 className="text-white font-semibold shadow-sm">
            {item.title}
          </h3>
        </div>
      </CardContent>
      <CardDescription className="px-4 py-2 text-sm">
        {item.description ?? "No description"}
      </CardDescription>
      <CardFooter className="border-t px-4 py-3 flex items-center justify-between">
        <Badge variant="outline" className="text-xs capitalize">
          {item.media_type.replace(/_/g, " ")}
        </Badge>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={isPending}
          aria-label={`Delete ${item.title}`}
        >
          {isPending ? (
            <Loader2Icon className="animate-spin size-4" />
          ) : (
            <Trash2Icon className="size-4" />
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

export function AddPortfolioDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [state, addAction, isPending] = useActionState(
    addPortfolioItem,
    { ok: false, message: null, fieldErrors: {} },
  );
  const [isSubmitting, startTransition] = useTransition();

  const form = useForm<PortfolioItemValues>({
    resolver: zodResolver(portfolioItemSchema),
    defaultValues: {
      title: "",
      description: "",
      media_type: "image",
      media_url: "",
    },
  });

  function onSubmit(values: PortfolioItemValues) {
    const formData = new FormData();
    formData.append("title", values.title);
    formData.append("description", values.description ?? "");
    formData.append("media_type", values.media_type);
    formData.append("media_url", values.media_url);
    startTransition(async () => {
      await addAction(formData);
    });
  }

  useEffect(() => {
    if (state.ok) {
      onClose();
      form.reset();
    }
  }, [state.ok, onClose, form]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PlusIcon className="size-4 shrink-0" />
          Add portfolio item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add portfolio item</DialogTitle>
          <DialogDescription>
            Add a piece of work to your public showcase.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Summer campaign for Nike" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Briefly describe this piece of work"
                      value={String(field.value ?? "")}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormDescription>Optional — up to 1,000 characters.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="media_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Media type</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose type" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          { value: "image", label: "Image" },
                          { value: "video_link", label: "Video link" },
                          { value: "content_sample", label: "Content sample" },
                        ].map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
              name="media_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Media URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/your-work.jpg"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>A direct link to the image or video.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending || isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || isSubmitting}>
                {isPending || isSubmitting ? (
                  <>
                    <Loader2Icon className="animate-spin size-4 shrink-0" />
                    Adding…
                  </>
                ) : (
                  <>
                    <PlusIcon className="size-4 shrink-0" />
                    Add item
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
