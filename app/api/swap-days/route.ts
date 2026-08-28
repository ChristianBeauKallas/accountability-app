import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Session = {
  title: string | null;
  detail: string | null;
  exercises: unknown;
  planWorkoutId: string | null;
};

const REST: Session = {
  title: "Rest",
  detail: "Rest / recovery day.",
  exercises: [],
  planWorkoutId: null,
};

const isoWeekday = (day: string) => {
  const wd = new Date(day + "T12:00:00").getDay();
  return wd === 0 ? 7 : wd;
};

// Swap the sessions on two specific DATES over the next couple of weeks. Each
// date gets a per-date override (coaching_workout_adjustments) so the two weeks
// can be arranged independently of the recurring template — swap tempo & long
// run, move a rest day, etc., for just those dates. Habits stay on their weekly
// schedule.
export async function POST(req: Request) {
  const user = await verifyBearer(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { dayA?: string; dayB?: string } | null;
  const a = body?.dayA;
  const b = body?.dayB;
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!a || !b || a === b || !re.test(a) || !re.test(b))
    return NextResponse.json({ error: "bad days" }, { status: 400 });

  const admin = createAdminClient();

  const { data: rel } = await admin
    .from("coaching_relationships")
    .select("id")
    .eq("client_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!rel) return NextResponse.json({ error: "no plan" }, { status: 404 });

  const { data: plan } = await admin
    .from("coaching_plans")
    .select("id")
    .eq("relationship_id", rel.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!plan) return NextResponse.json({ error: "no active plan" }, { status: 404 });

  // Current session on a date = its override if any, else the template for that
  // weekday, else Rest.
  async function resolve(day: string): Promise<Session> {
    const { data: adj } = await admin
      .from("coaching_workout_adjustments")
      .select("title, detail, exercises, plan_workout_id")
      .eq("relationship_id", rel!.id)
      .eq("day", day)
      .maybeSingle();
    if (adj)
      return {
        title: (adj.title as string) ?? null,
        detail: (adj.detail as string) ?? null,
        exercises: adj.exercises ?? [],
        planWorkoutId: (adj.plan_workout_id as string) ?? null,
      };
    const { data: w } = await admin
      .from("coaching_plan_workouts")
      .select("id, title, detail, exercises")
      .eq("plan_id", plan!.id)
      .eq("weekday", isoWeekday(day))
      .maybeSingle();
    if (w)
      return {
        title: w.title as string,
        detail: (w.detail as string) ?? null,
        exercises: w.exercises ?? [],
        planWorkoutId: (w.id as string) ?? null,
      };
    return REST;
  }

  const [sa, sb] = await Promise.all([resolve(a), resolve(b)]);

  // Write each date's override to the OTHER date's session.
  const rows = [
    { day: a, s: sb },
    { day: b, s: sa },
  ].map(({ day, s }) => ({
    relationship_id: rel.id,
    client_id: user.id,
    plan_workout_id: s.planWorkoutId,
    day,
    title: s.title,
    detail: s.detail,
    exercises: s.exercises,
    note: "Moved",
    reason: "Rearranged the week",
  }));

  const { error } = await admin
    .from("coaching_workout_adjustments")
    .upsert(rows, { onConflict: "relationship_id,day" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
