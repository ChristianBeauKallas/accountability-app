import { requireProfile } from "@/lib/auth";
import { getCoachPrograms } from "@/lib/coach";
import { NeedForm } from "@/components/coach/NeedForm";

export const dynamic = "force-dynamic";

export default async function NewNeedPage({
  searchParams,
}: {
  searchParams: { welcome?: string };
}) {
  const { userId } = await requireProfile("coach");
  const programs = await getCoachPrograms(userId);
  return (
    <NeedForm
      programId={programs[0].id}
      firstNeed={searchParams.welcome === "1"}
    />
  );
}
