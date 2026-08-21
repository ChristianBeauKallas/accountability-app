import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Copy an existing client's plan (macro targets + weekly workouts) onto another
// client you coach. Great for onboarding: attach a proven plan instead of
// building from scratch. The copy is activated immediately for the target, and
// any prior plan of theirs is archived. The coach can still tweak it after.
export async function POST(req: Request) {
  const coach = await verifyBearer(req);
  if (!coach) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    sourceClientId?: string;
    targetClientId?: string;
  } | null;
  const sourceClientId = body?.sourceClientId;
  const targetClientId = body?.targetClientId;
  if (!sourceClientId || !targetClientId || sourceClientId === targetClientId)
    return NextResponse.json({ error: "bad request" }, { status: 400 });

  const admin = createAdminClient();

  // Both relationships must be ones this coach owns.
  const { data: rels } = await admin
    .from("coaching_relationships")
    .select("id, client_id")
    .eq("coach_id", coach.id)
    .in("client_id", [sourceClientId, targetClientId]);
  const sourceRel = (rels ?? []).find((r) => r.client_id === sourceClientId);
  const targetRel = (rels ?? []).find((r) => r.client_id === targetClientId);
  if (!sourceRel)
    return NextResponse.json({ error: "you don't coach the source client" }, { status: 403 });
  if (!targetRel)
    return NextResponse.json(
      { error: "start coaching this person first" },
      { status: 403 },
    );

  // The source plan: their active one, else the most recent.
  const { data: srcPlans } = await admin
    .from("coaching_plans")
    .select("*")
    .eq("relationship_id", sourceRel.id)
    .order("status", { ascending: true }) // 'active' sorts before 'draft'/'archived'
    .order("created_at", { ascending: false })
    .limit(20);
  const srcPlan =
    (srcPlans ?? []).find((p) => p.status === "active") ?? (srcPlans ?? [])[0];
  if (!srcPlan)
    return NextResponse.json(
      { error: "that client doesn't have a plan to copy" },
      { status: 404 },
    );

  const { data: srcWorkouts } = await admin
    .from("coaching_plan_workouts")
    .select("weekday, title, kind, detail, exercises, sort_order")
    .eq("plan_id", srcPlan.id)
    .order("weekday");

  // Archive any existing plans for the target so the copy is the live one.
  await admin
    .from("coaching_plans")
    .update({ status: "archived" })
    .eq("relationship_id", targetRel.id)
    .in("status", ["active", "draft"]);

  // Create the new active plan for the target, copying targets + notes.
  const nowISO = new Date().toISOString();
  const { data: newPlan, error: planErr } = await admin
    .from("coaching_plans")
    .insert({
      relationship_id: targetRel.id,
      client_id: targetClientId,
      week_number: 1,
      status: "active",
      summary: srcPlan.summary ?? null,
      diet_notes: srcPlan.diet_notes ?? null,
      calorie_target: srcPlan.calorie_target ?? null,
      protein_target: srcPlan.protein_target ?? null,
      carbs_target: srcPlan.carbs_target ?? null,
      fat_target: srcPlan.fat_target ?? null,
      water_target: srcPlan.water_target ?? null,
      example_day: srcPlan.example_day ?? null,
      goal_weight: srcPlan.goal_weight ?? null,
      activated_at: nowISO,
    })
    .select("id")
    .single();
  if (planErr || !newPlan)
    return NextResponse.json(
      { error: planErr?.message ?? "couldn't create the plan" },
      { status: 500 },
    );

  // Copy the weekly workouts onto the new plan.
  if ((srcWorkouts ?? []).length > 0) {
    const rows = (srcWorkouts ?? []).map((w) => ({
      plan_id: newPlan.id as string,
      weekday: w.weekday,
      title: w.title,
      kind: w.kind,
      detail: w.detail,
      exercises: w.exercises,
      sort_order: w.sort_order,
    }));
    const { error: woErr } = await admin
      .from("coaching_plan_workouts")
      .insert(rows);
    if (woErr)
      return NextResponse.json({ error: woErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, planId: newPlan.id });
}
