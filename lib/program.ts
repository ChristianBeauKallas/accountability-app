import { createClient } from "@/lib/supabase/server";
import type { ProgramStats } from "@/components/program/SchoolProfile";

// Derives the "looking for" positions, academic floor, and open-spot count
// from a program's open needs.
export async function getProgramStats(programId: string): Promise<ProgramStats> {
  const supabase = createClient();
  const { data } = await supabase
    .from("needs")
    .select("positions, min_gpa")
    .eq("program_id", programId)
    .eq("status", "open");

  const rows = (data ?? []) as { positions: string[]; min_gpa: number }[];
  const positions = Array.from(
    new Set(rows.flatMap((n) => n.positions ?? []))
  ).sort();
  const gpas = rows.map((n) => n.min_gpa).filter((g) => g != null && g > 0);
  const minGpa = gpas.length ? Math.min(...gpas) : null;

  return { positions, minGpa, openNeeds: rows.length };
}
