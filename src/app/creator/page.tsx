import { redirect } from "next/navigation";

/**
 * The old creator dashboard duplicated the profile page. Keep the root
 * route as a short redirect so existing bookmarks and role-mismatch links
 * land on discovery, where the onboarding gate still applies.
 */
export default function CreatorRootPage() {
  redirect("/creator/discover");
}
