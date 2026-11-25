import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ServiceResult } from "./profile.service";
import type { Notification } from "@/types/collaboration.types";

export type NotificationFilter = "all" | "unread";

/** Newest notifications for the signed-in profile. RLS scopes the rows to
 *  the owner; the explicit profile_id filter keeps the intent obvious. */
export async function listNotifications(
  userId: string,
  filter: NotificationFilter = "all",
  limit = 50,
): Promise<Notification[]> {
  const supabase = await createClient();
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filter === "unread") {
    query = query.is("read_at", null);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as Notification[];
}

/** Unread count for the nav badge. */
export async function countUnreadNotifications(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", userId)
    .is("read_at", null);

  if (error) return 0;
  return count ?? 0;
}

/** Mark one notification read. Idempotent: already-read rows are a no-op. */
export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<ServiceResult<number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("profile_id", userId)
    .is("read_at", null)
    .select("id");

  if (error) return { ok: false, message: "Could not update that notification." };
  return { ok: true, data: data?.length ?? 0 };
}

/** Mark every unread notification for the caller as read. */
export async function markAllNotificationsRead(
  userId: string,
): Promise<ServiceResult<number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("profile_id", userId)
    .is("read_at", null)
    .select("id");

  if (error) return { ok: false, message: "Could not update your notifications." };
  return { ok: true, data: data?.length ?? 0 };
}

/** Dismiss a notification. Only the owner may delete (RLS). */
export async function deleteNotification(
  userId: string,
  notificationId: string,
): Promise<ServiceResult<null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("profile_id", userId)
    .select("id");

  if (error) return { ok: false, message: "Could not dismiss that notification." };
  if (!data || data.length === 0) {
    return { ok: false, message: "That notification was not found." };
  }
  return { ok: true, data: null };
}
