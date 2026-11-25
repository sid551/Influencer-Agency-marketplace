"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BellIcon,
  CheckCheckIcon,
  CheckCircle2Icon,
  ClockIcon,
  FileTextIcon,
  MessageSquareIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  deleteNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Notification, NotificationType } from "@/types/collaboration.types";

const TYPE_ICONS: Record<NotificationType, typeof BellIcon> = {
  application_status: FileTextIcon,
  collaboration_invitation: BellIcon,
  message: MessageSquareIcon,
  deadline: ClockIcon,
  revision_request: RefreshCwIcon,
  approval: CheckCircle2Icon,
  completion: CheckCircle2Icon,
  system: BellIcon,
};

const TYPE_LABELS: Record<NotificationType, string> = {
  application_status: "Application",
  collaboration_invitation: "Invitation",
  message: "Message",
  deadline: "Deadline",
  revision_request: "Review",
  approval: "Approval",
  completion: "Completed",
  system: "Account",
};

/** Notification inbox. Initial rows are server-rendered; INSERT/UPDATE
 *  events arrive through Supabase Realtime (RLS limits the stream to the
 *  signed-in profile). Mutations are optimistic and revalidated on the
 *  server action side so the nav badge stays in sync. */
export function NotificationList({
  initialNotifications,
  currentUserId,
}: {
  initialNotifications: Notification[];
  currentUserId: string;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [, startTransition] = useTransition();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const channel = supabase
      .channel(`creator-notifications-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `profile_id=eq.${currentUserId}`,
        },
        (payload) => {
          const incoming = payload.new as Notification;
          setNotifications((previous) =>
            previous.some((item) => item.id === incoming.id)
              ? previous
              : [incoming, ...previous],
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `profile_id=eq.${currentUserId}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications((previous) =>
            previous.map((item) => (item.id === updated.id ? updated : item)),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, supabase]);

  const visible = useMemo(
    () =>
      filter === "unread"
        ? notifications.filter((item) => item.read_at === null)
        : notifications,
    [filter, notifications],
  );
  const unreadCount = notifications.filter((item) => item.read_at === null).length;

  function handleMarkRead(notification: Notification) {
    if (notification.read_at) return;
    const readAt = new Date().toISOString();
    setNotifications((previous) =>
      previous.map((item) =>
        item.id === notification.id ? { ...item, read_at: readAt } : item,
      ),
    );
    startTransition(async () => {
      const result = await markNotificationReadAction(notification.id);
      if (!result.ok) {
        setNotifications((previous) =>
          previous.map((item) =>
            item.id === notification.id ? { ...item, read_at: null } : item,
          ),
        );
        if (result.message) toast.error(result.message);
      }
    });
  }

  function handleMarkAllRead() {
    const readAt = new Date().toISOString();
    const previousRows = notifications;
    setNotifications((rows) =>
      rows.map((item) => (item.read_at ? item : { ...item, read_at: readAt })),
    );
    startTransition(async () => {
      const result = await markAllNotificationsReadAction();
      if (!result.ok) {
        setNotifications(previousRows);
        if (result.message) toast.error(result.message);
      }
    });
  }

  function handleDelete(notification: Notification) {
    const previousRows = notifications;
    setNotifications((rows) => rows.filter((item) => item.id !== notification.id));
    startTransition(async () => {
      const result = await deleteNotificationAction(notification.id);
      if (!result.ok) {
        setNotifications(previousRows);
        if (result.message) toast.error(result.message);
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Updates about your applications, collaborations and account.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
        >
          <CheckCheckIcon className="size-4" />
          Mark all read
        </Button>
      </div>

      <div className="mt-6 flex gap-2" role="tablist" aria-label="Notification filter">
        <Button
          type="button"
          role="tab"
          aria-selected={filter === "all"}
          variant={filter === "all" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button
          type="button"
          role="tab"
          aria-selected={filter === "unread"}
          variant={filter === "unread" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setFilter("unread")}
        >
          Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
        </Button>
      </div>

      {visible.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <BellIcon className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {filter === "unread"
                ? "You're all caught up. No unread notifications."
                : "No notifications yet. Updates will appear here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="mt-4 grid gap-2">
          {visible.map((notification) => {
            const Icon = TYPE_ICONS[notification.type] ?? BellIcon;
            const unread = notification.read_at === null;
            const summary = (
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Icon className="size-4 text-muted-foreground" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {TYPE_LABELS[notification.type] ?? notification.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(notification.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm font-medium">{notification.title}</p>
                  {notification.body ? (
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                      {notification.body}
                    </p>
                  ) : null}
                </div>
                {unread ? (
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                    aria-label="Unread"
                  />
                ) : null}
              </div>
            );

            const isInternalLink = notification.link_path?.startsWith("/creator/");
            return (
              <li key={notification.id}>
                <Card className={unread ? "border-primary/40 bg-primary/5" : ""}>
                  <CardContent className="py-3">
                    {isInternalLink ? (
                      <Link
                        href={notification.link_path!}
                        onClick={() => handleMarkRead(notification)}
                        className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {summary}
                      </Link>
                    ) : (
                      summary
                    )}
                    <div className="mt-3 flex justify-end gap-2">
                      {unread ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkRead(notification)}
                        >
                          Mark read
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(notification)}
                      >
                        <Trash2Icon className="size-4" />
                        Dismiss
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Deterministic UTC timestamp so server and client markup match on hydration. */
function formatTimestamp(value: string): string {
  return `${value.slice(0, 16).replace("T", " ")} UTC`;
}
