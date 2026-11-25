"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2Icon, SendIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { markConversationReadAction, sendMessageAction } from "./actions";
import type { MessageActionState } from "./actions";
import { messageSchema } from "@/lib/validations/collaboration";
import type { MessageValues } from "@/lib/validations/collaboration";
import type { Message } from "@/types/collaboration.types";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

const EMPTY_STATE: MessageActionState = {
  ok: false,
  message: null,
  fieldErrors: {},
  sent: null,
};

/**
 * Live conversation thread. Initial history is server-rendered; new rows
 * arrive through Supabase Realtime (RLS restricts the stream to the two
 * collaboration participants). Messages from the other party are marked
 * read when the thread is opened and whenever a new one arrives.
 */
export function MessageThread({
  conversationId,
  currentUserId,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const supabase = useMemo(() => createClient(), []);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [isSending, startSend] = useTransition();
  const [, startRead] = useTransition();

  const markRead = useCallback(() => {
    startRead(async () => {
      await markConversationReadAction(conversationId);
    });
  }, [conversationId, startRead]);

  // Reading the thread on open clears the unread badge for these messages.
  useEffect(() => {
    markRead();
  }, [markRead]);

  useEffect(() => {
    const channel = supabase
      .channel(`creator-conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((previous) =>
            previous.some((message) => message.id === incoming.id)
              ? previous
              : [...previous, incoming],
          );
          if (incoming.sender_profile_id !== currentUserId) markRead();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((previous) =>
            previous.map((message) =>
              message.id === updated.id ? updated : message,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, markRead, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const form = useForm<MessageValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: { body: "" },
  });

  function onSubmit(values: MessageValues) {
    const formData = new FormData();
    formData.append("body", values.body);

    startSend(async () => {
      const result = await sendMessageAction(
        conversationId,
        EMPTY_STATE,
        formData,
      );
      if (!result.ok) {
        if (result.message) toast.error(result.message);
        return;
      }
      if (result.sent) {
        const sent = result.sent;
        setMessages((previous) =>
          previous.some((message) => message.id === sent.id)
            ? previous
            : [...previous, sent],
        );
      }
      form.reset({ body: "" });
    });
  }

  return (
    <div className="flex h-[min(70vh,640px)] flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No messages yet. Say hello to start the conversation.
          </p>
        ) : (
          messages.map((message) => {
            const mine = message.sender_profile_id === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  <p
                    className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                  >
                    {new Date(message.created_at).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {mine && message.read_at ? " · Read" : ""}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-3">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-2" noValidate>
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={2}
                      placeholder="Write a message…"
                      aria-label="Message"
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          (event.metaKey || event.ctrlKey)
                        ) {
                          event.preventDefault();
                          event.currentTarget.form?.requestSubmit();
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" size="icon" disabled={isSending} aria-label="Send message">
              {isSending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SendIcon className="size-4" />
              )}
            </Button>
          </form>
        </Form>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Press ⌘/Ctrl + Enter to send.
        </p>
      </div>
    </div>
  );
}
