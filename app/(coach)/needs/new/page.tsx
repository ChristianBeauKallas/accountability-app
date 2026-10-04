import { requireProfile } from "@/lib/auth";
import { getCoachPrograms } from "@/lib/coach";
import { NeedForm } from "@/components/coach/NeedForm";

export const dynamic = "force-dynamic";

export default async function NewNeedPage() {
  const { userId } = await requireProfile("coach");
  const programs = await getCoachPrograms(userId);
  return <NeedForm programId={programs[0].id} />;
}
