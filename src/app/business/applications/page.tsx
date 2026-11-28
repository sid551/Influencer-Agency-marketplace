import { redirect } from "next/navigation";


export const metadata = { title: "Applications" };
export const instant = false;

/** Application reviews now live inside each campaign. Keep old links working. */
export default async function LegacyBusinessApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>;
}) {
  const { campaign } = await searchParams;
  const reference =
    typeof campaign === "string" && /^[A-Za-z0-9-]{1,60}$/.test(campaign)
      ? campaign
      : null;
  redirect(
    reference
      ? `/business/campaigns/${reference}/applications`
      : "/business/campaigns",
  );
  return null;
}
