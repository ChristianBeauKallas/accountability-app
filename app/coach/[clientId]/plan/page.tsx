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
      />
    </main>
  );
}
