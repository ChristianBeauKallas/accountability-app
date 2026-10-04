import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getProgramStats } from "@/lib/program";
import {
  SchoolProfile,
  type StaffMember,
} from "@/components/program/SchoolProfile";
import type { Program } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SchoolPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId } = await requireProfile("player");
  const supabase = createClient();

  const { data: program } = await supabase
    .from("programs")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!program) notFound();

  const { data: staffRows } = await supabase
    .from("program_staff")
    .select("staff_role, profile:profiles(full_name)")
    .eq("program_id", params.id);

  const stats = await getProgramStats(params.id);

  const { data: follow } = await supabase
    .from("program_followers")
    .select("program_id")
    .eq("player_id", userId)
    .eq("program_id", params.id)
    .maybeSingle();

  return (
    <SchoolProfile
      program={program as Program}
      stats={stats}
      staff={(staffRows ?? []) as unknown as StaffMember[]}
      editable={false}
      viewerId={userId}
      showBack
      isFollowing={!!follow}
    />
  );
}
