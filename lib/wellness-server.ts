import { createClient } from "@/lib/supabase/server";
import type { Member, Program, Viewer } from "@/lib/wellness";

// The signed-in user plus their member row and program, or null if either the
// session or the membership is missing (brand-new accounts have no member yet).
export async function getViewer(): Promise<Viewer | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: member } = await supabase
    .from("wl_members")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!member) return null;

  const { data: program } = await supabase
    .from("wl_programs")
    .select("*")
    .eq("id", (member as Member).program_id)
    .single();
  if (!program) return null;

  return {
    userId: user.id,
    member: member as Member,
    program: program as Program,
  };
}
