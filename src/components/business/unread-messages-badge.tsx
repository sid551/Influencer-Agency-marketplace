import { connection } from "next/server";
import { cn } from "cn";

import { requireBusiness } from "@/lib/auth/session";
import { countUnreadBusinessMessages } from "@/services/message.service";

/** Small count next to the business Messages nav link. Streams separately
 *  so the shell doesn't wait on the inbox query. */
export async function UnreadMessagesBadge({ className }: { className?: string }) {
  await connection();
  const { user } = await requireBusiness();
  const count = await countUnreadBusinessMessages(user.id);
  if (count === 0) return null;

  return (
    <span
      className={cn(
        "inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground",
        className,
      )}
      aria-label={`${count} unread messages`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
