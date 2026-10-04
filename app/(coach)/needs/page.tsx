import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCoachPrograms } from "@/lib/coach";
import { NeedsView, type NeedWithCount } from "@/components/coach/NeedsView";
import type { Need } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NeedsPage() {
  const { userId } = await requireProfile("coach");
  const programs = await getCoachPrograms(userId);
  const programIds = programs.map((p) => p.id);
  const supabase = createClient();

  const { data: needsData } = await supabase
    .from("needs")
    .select("*")
    .in("program_id", programIds)
    .order("created_at", { ascending: false });

  const needs = (needsData ?? []) as Need[];

  // Applicant counts (RLS scopes applications to the coach's needs).
  const { data: appRows } = await supabase
    .from("applications")
    .select("need_id");
  const counts = new Map<string, number>();
  for (const r of appRows ?? []) {
    counts.set(r.need_id, (counts.get(r.need_id) ?? 0) + 1);
  }

  const withCounts: NeedWithCount[] = needs.map((n) => ({
    ...n,
    applicant_count: counts.get(n.id) ?? 0,
  }));

  const openCount = needs.filter((n) => n.status === "open").length;

  return (
    <main className="px-5 pt-12">
      <p className="eyebrow">Open spots</p>
      <h1 className="mt-1 text-3xl font-display font-bold tracking-tight">
        Needs
      </h1>
      <p className="mt-1 mb-5 text-[15px] text-body-2">
        {needs.length > 0
          ? `${openCount} open · ${needs.length} total.`
          : "Post the roster spots you're recruiting."}
      </p>
      <NeedsView needs={withCounts} />
    </main>
  );
}
