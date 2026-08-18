import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { localDate } from "@/lib/streaks";
import type { PlanExercise } from "@/lib/types";
import WorkoutLogger from "./workout-logger";

export const dynamic = "force-dynamic";

const WD: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

export default async function WorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rels } = await supabase
    .from("coaching_relationships")
    .select("id")
    .eq("client_id", user.id)
    .limit(1);
  const rel = rels?.[0] as { id: string } | undefined;
  if (!rel) {
    return (
      <main className="board">
        <div className="notice">You&apos;re not in a coaching program yet.</div>
      </main>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle();
  const tz = profile?.timezone ?? "America/New_York";
  const realToday = localDate(new Date(), tz);
  const sp = (await searchParams) ?? {};
  const today =
    typeof sp.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) && sp.d <= realToday
      ? sp.d
      : realToday;
  const wdShort = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
  }).format(new Date(today + "T12:00:00"));
  const weekday = WD[wdShort] ?? 1;

  // Today's prescribed workout from the active plan.
  const { data: planRows } = await supabase
    .from("coaching_plans")
    .select("id")
    .eq("relationship_id", rel.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);
  const planId = planRows?.[0]?.id as string | undefined;

  let title = "Workout";
  let planWorkoutId: string | null = null;
  let exercises: PlanExercise[] = [];
  if (planId) {
    const { data: w } = await supabase
      .from("coaching_plan_workouts")
      .select("id, title, exercises")
      .eq("plan_id", planId)
      .eq("weekday", weekday)
      .maybeSingle();
    if (w) {
      title = w.title as string;
      planWorkoutId = w.id as string;
      exercises = ((w.exercises as PlanExercise[]) ?? []).filter((e) => e?.name);
    }
  }

  // If the client reworked today's session, log the adjusted version instead.
  const { data: adj } = await supabase
    .from("coaching_workout_adjustments")
    .select("title, exercises")
    .eq("relationship_id", rel.id)
    .eq("day", today)
    .maybeSingle();
  if (adj) {
    if (adj.title) title = adj.title as string;
    exercises = ((adj.exercises as PlanExercise[]) ?? []).filter((e) => e?.name);
  }

  // Existing log for today (to resume/edit).
  const { data: existingLog } = await supabase
    .from("coaching_workout_logs")
    .select("id, effort")
    .eq("relationship_id", rel.id)
    .eq("day", today)
    .maybeSingle();

  let existingSets: {
    exercise_name: string;
    set_index: number;
    weight: number | null;
    reps: number | null;
  }[] = [];
  if (existingLog) {
    const { data: s } = await supabase
      .from("coaching_exercise_sets")
      .select("exercise_name, set_index, weight, reps")
      .eq("workout_log_id", existingLog.id)
      .order("set_index");
    existingSets = (s ?? []) as typeof existingSets;
  }

  // Last-time weights per exercise (for the progression prefill).
  const names = exercises.map((e) => e.name);
  const lastByExercise: Record<string, { weight: number | null; reps: number | null }> = {};
  if (names.length > 0) {
    const { data: recent } = await supabase
      .from("coaching_exercise_sets")
      .select("exercise_name, weight, reps, created_at, workout_log_id")
      .in("exercise_name", names)
      .order("created_at", { ascending: false })
      .limit(400);
    // Most recent set per exercise, excluding today's log.
    for (const r of (recent ?? []) as {
      exercise_name: string;
      weight: number | null;
      reps: number | null;
      workout_log_id: string;
    }[]) {
      if (existingLog && r.workout_log_id === existingLog.id) continue;
      if (!lastByExercise[r.exercise_name])
        lastByExercise[r.exercise_name] = { weight: r.weight, reps: r.reps };
    }
  }

  return (
    <main className="board">
      <header className="board-head">
        <div className="board-head-top">
          <div>
            <h1>{title}</h1>
            <p className="subtitle">
              <Link href={`/coaching?d=${today}`}>‹ Your day</Link>
            </p>
          </div>
        </div>
      </header>

      <WorkoutLogger
        relationshipId={rel.id}
        userId={user.id}
        day={today}
        title={title}
        planWorkoutId={planWorkoutId}
        exercises={exercises}
        existingLogId={existingLog?.id ?? null}
        existingEffort={(existingLog?.effort as string) ?? null}
        existingSets={existingSets}
        lastByExercise={lastByExercise}
      />
    </main>
  );
}
