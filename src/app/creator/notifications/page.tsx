import { Suspense } from "react";
import { connection } from "next/server";

import { requireCreator } from "@/lib/auth/session";
import { listNotifications } from "@/services/notification.service";
import { Card } from "@/components/ui/card";
import { NotificationList } from "./notification-list";

export const metadata = { title: "Notifications" };

/** Notification inbox. Streams behind Suspense like the other creator
 *  pages under Cache Components; the list itself subscribes to Realtime. */
export default function CreatorNotificationsPage() {
  return (
    <Suspense fallback={<NotificationsSkeleton />}>
      <NotificationsLoader />
    </Suspense>
  );
}

async function NotificationsLoader() {
  await connection();
  const { user } = await requireCreator();
  const notifications = await listNotifications(user.id);

  return (
    <NotificationList
      initialNotifications={notifications}
      currentUserId={user.id}
    />
  );
}

function NotificationsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
      <div className="mt-6 grid gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="h-24 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
