import { redirect } from "next/navigation";

/** Verification now lives on the profile page. Keep the old URL working for
 *  existing notification deep links and bookmarks. */
export default function CreatorVerificationPage() {
  redirect("/creator/profile#verification");
}
