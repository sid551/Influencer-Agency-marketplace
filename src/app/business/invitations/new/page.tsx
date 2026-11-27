import { redirect } from "next/navigation";

/** The invitation composer was removed; keep old links/bookmarks working. */
export default function NewInvitationPage() {
  redirect("/business/messages");
}
