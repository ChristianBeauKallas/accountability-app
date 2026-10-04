import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCoachPrograms } from "@/lib/coach";
import { getProgramStats } from "@/lib/program";
import {
  SchoolProfile,
  type StaffMember,
} from "@/components/program/SchoolProfile";

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

  const stats = await getProgramStats(program.id);

  return (
    <SchoolProfile
      program={program}
      stats={stats}
      staff={(staffData ?? []) as unknown as StaffMember[]}
      editable
      viewerId={userId}
    />
  );
}
