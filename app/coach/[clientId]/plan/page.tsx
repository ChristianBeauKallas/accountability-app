import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CoachingIntake, CoachingPlan, PlanWorkout } from "@/lib/types";
import CoachPlanEditor from "./coach-plan-editor";

export const dynamic = "force-dynamic";

export default async function CoachPlanPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rel } = await supabase
    .from("coaching_relationships")
    .select("id")
    .eq("coach_id", user.id)
    .eq("client_id", clientId)
    .maybeSingle();
  if (!rel) notFound();

  const { data: client } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", clientId)
    .maybeSingle();

  const { data: intakes } = await supabase
    .from("coaching_intakes")
    .select("*")
    .eq("relationship_id", rel.id)
    .order("submitted_at", { ascending: false })
    .limit(1);
  const intake = (intakes?.[0] ?? null) as CoachingIntake | null;

  // The plan we're working on: a draft if one exists, else the active one.
  const { data: plans } = await supabase
    .from("coaching_plans")
    .select("*")
    .eq("relationship_id", rel.id)
    .in("status", ["draft", "active"])
    .order("created_at", { ascending: false })
    .limit(1);
  const plan = (plans?.[0] ?? null) as CoachingPlan | null;

  let workouts: PlanWorkout[] = [];
  if (plan) {
    const { data: w } = await supabase
      .from("coaching_plan_workouts")
      .select("*")
      .eq("plan_id", plan.id)
      .order("weekday");
    workouts = (w ?? []) as PlanWorkout[];
  }

  // Recap of the active week's actual performance (drives "build next week").
  const { data: activeRows } = await supabase
    .from("coaching_plans")
    .select("id, week_number, activated_at")
    .eq("relationship_id", rel.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);
  const active = activeRows?.[0] as
    | { id: string; week_number: number; activated_at: string | null }
    | undefined;

  let recap: {
    planId: string;
    week: number;
    days: number;
    workouts: number;
    weight: string | null;
  } | null = null;
  if (active?.activated_at) {
    const since = active.activated_at;
    const [{ data: ents }, { count: woCount }, { data: wt }] = await Promise.all([
      supabase
        .from("coaching_entries")
        .select("happened_at")
        .eq("relationship_id", rel.id)
        .gte("happened_at", since),
      supabase
        .from("coaching_workout_logs")
        .select("id", { count: "exact", head: true })
        .eq("relationship_id", rel.id)
        .gte("day", since.slice(0, 10)),
      supabase
        .from("coaching_trackers")
        .select("id")
        .eq("relationship_id", rel.id)
        .eq("label", "Weight")
        .maybeSingle(),
    ]);
    const days = new Set(
      (ents ?? []).map((e) => String(e.happened_at).slice(0, 10)),
    ).size;
    let weight: string | null = null;
    if (wt) {
      const { data: we } = await supabase
        .from("coaching_entries")
        .select("amount, happened_at")
        .eq("tracker_id", wt.id)
        .gte("happened_at", since)
        .order("happened_at", { ascending: true });
      const vals = (we ?? [])
        .map((e) => Number(e.amount))
        .filter((n) => Number.isFinite(n));
      if (vals.length >= 1) {
        const d = Math.round((vals[vals.length - 1] - vals[0]) * 10) / 10;
        weight = `${vals[vals.length - 1]} lb (${d >= 0 ? "+" : ""}${d})`;
      }
    }
    recap = {
      planId: active.id,
      week: active.week_number,
      days,
      workouts: woCount ?? 0,
      weight,
    };
  }

  return (
    <main className="board">
      <header className="board-head">
        <div className="board-head-top">
          <div>
            <h1>{client?.display_name ?? "Client"}&apos;s plan</h1>
            <p className="subtitle">
              <Link href={`/coach/${clientId}`}>‹ Dashboard</Link>
            </p>
          </div>
        </div>
      </header>

      <CoachPlanEditor
        clientId={clientId}
        intake={intake}
        plan={plan}
        workouts={workouts}
        recap={recap}
      />
    </main>
  );
}
