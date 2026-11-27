import { redirect } from "next/navigation";

/** Invitations were removed; keep old links/bookmarks working. */
export default function BusinessInvitationsPage() {
  redirect("/business/messages");
}
