import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCoachPrograms } from "@/lib/coach";
import { NeedForm } from "@/components/coach/NeedForm";
import type { Need } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditNeedPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId } = await requireProfile("coach");
  await getCoachPrograms(userId); // ensures coach context
  const supabase = createClient();

  const { data: need } = await supabase
    .from("needs")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!need) redirect("/needs");

  return <NeedForm programId={need.program_id} need={need as Need} />;
}
