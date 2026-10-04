import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCoachPrograms } from "@/lib/coach";
import { ProgramView, type StaffMember } from "@/components/coach/ProgramView";

export const dynamic = "force-dynamic";

export default async function ProgramPage() {
  const { userId } = await requireProfile("coach");
  const programs = await getCoachPrograms(userId);
  const program = programs[0];
  const supabase = createClient();

  const { data: staffData } = await supabase
    .from("program_staff")
    .select("staff_role, profile:profiles(full_name)")
    .eq("program_id", program.id);

  const staff = (staffData ?? []) as unknown as StaffMember[];

  return <ProgramView program={program} staff={staff} />;
}
