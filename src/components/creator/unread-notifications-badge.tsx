import { connection } from "next/server";
import { cn } from "cn";

import { requireCreator } from "@/lib/auth/session";
import { countUnreadNotifications } from "@/services/notification.service";

/** Small unread count next to the Notifications nav link. Streams
 *  separately so the creator shell doesn't wait on the query. */
export async function UnreadNotificationsBadge({
  className,
}: {
  className?: string;
}) {
  await connection();
  const { user } = await requireCreator();
  const count = await countUnreadNotifications(user.id);
  if (count === 0) return null;

  return (
    <span
      className={cn(
        "inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground",
        className,
      )}
      aria-label={`${count} unread notifications`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
