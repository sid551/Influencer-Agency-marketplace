import { redirect } from "next/navigation";

import { uuidSchema } from "@/lib/validations/ids";

export const metadata = { title: "Applications" };
export const instant = false;

/** Application reviews now live inside each campaign. Keep old links working. */
export default async function LegacyBusinessApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>;
}) {
  const { campaign } = await searchParams;
  const parsed = typeof campaign === "string" ? uuidSchema.safeParse(campaign) : null;
  redirect(
    parsed?.success
      ? `/business/campaigns/${parsed.data}/applications`
      : "/business/campaigns",
  );
  return null;
}
