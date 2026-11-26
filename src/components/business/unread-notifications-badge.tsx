import { connection } from "next/server";

import { requireBusiness } from "@/lib/auth/session";
import { countUnreadNotifications } from "@/services/notification.service";

/** Small unread count next to the business Notifications nav link. */
export async function UnreadNotificationsBadge() {
  await connection();
  const { user } = await requireBusiness();
  const count = await countUnreadNotifications(user.id);
  if (count === 0) return null;

  return (
    <span
      className="inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground"
      aria-label={`${count} unread notifications`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
