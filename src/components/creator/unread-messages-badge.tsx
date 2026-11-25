import { connection } from "next/server";

import { requireCreator } from "@/lib/auth/session";
import { countUnreadMessages } from "@/services/message.service";

/** Small count next to the Messages nav link. Streams separately so the
 *  rest of the creator shell doesn't wait on the inbox query. */
export async function UnreadMessagesBadge() {
  await connection();
  const { user } = await requireCreator();
  const count = await countUnreadMessages(user.id);
  if (count === 0) return null;

  return (
    <span
      className="inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground"
      aria-label={`${count} unread messages`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
