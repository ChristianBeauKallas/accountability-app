import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Program } from "@/lib/types";

// Returns the programs the current coach staffs. Redirects to onboarding if
// they somehow staff none (shouldn't happen post-onboarding).
export async function getCoachPrograms(userId: string): Promise<Program[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("program_staff")
    .select("program:programs(*)")
    .eq("profile_id", userId)
    .order("created_at", { ascending: true });

  const programs = (data ?? [])
    .map((r) => (r as unknown as { program: Program | null }).program)
    .filter((p): p is Program => !!p);

  if (programs.length === 0) redirect("/onboarding");
  return programs;
}
