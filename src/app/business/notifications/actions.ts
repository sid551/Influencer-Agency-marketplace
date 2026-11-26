"use server";

import { revalidatePath } from "next/cache";

import { requireBusiness } from "@/lib/auth/session";
import { uuidSchema } from "@/lib/validations/ids";
import {
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notification.service";

export interface NotificationMutationResult {
  ok: boolean;
  message: string | null;
}

/** The unread badge lives in the layout, so revalidate it with the page. */
function revalidateNotificationViews() {
  revalidatePath("/business", "layout");
  revalidatePath("/business/notifications");
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<NotificationMutationResult> {
  const id = uuidSchema.safeParse(notificationId);
  if (!id.success) return { ok: false, message: "Invalid request." };

  const { user } = await requireBusiness();
  const result = await markNotificationRead(user.id, id.data);
  if (!result.ok) return { ok: false, message: result.message };

  revalidateNotificationViews();
  return { ok: true, message: null };
}

export async function markAllNotificationsReadAction(): Promise<NotificationMutationResult> {
  const { user } = await requireBusiness();
  const result = await markAllNotificationsRead(user.id);
  if (!result.ok) return { ok: false, message: result.message };

  revalidateNotificationViews();
  return { ok: true, message: null };
}

export async function deleteNotificationAction(
  notificationId: string,
): Promise<NotificationMutationResult> {
  const id = uuidSchema.safeParse(notificationId);
  if (!id.success) return { ok: false, message: "Invalid request." };

  const { user } = await requireBusiness();
  const result = await deleteNotification(user.id, id.data);
  if (!result.ok) return { ok: false, message: result.message };

  revalidateNotificationViews();
  return { ok: true, message: null };
}
