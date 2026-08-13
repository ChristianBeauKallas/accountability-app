import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Build NEXT week from the current plan + how the client actually performed
// (logged weights, effort, weight trend, adherence). Progressive overload.
export async function POST(req: Request) {
  const user = await verifyBearer(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key)
    return NextResponse.json(
      { error: "Plan generation isn't set up (add ANTHROPIC_API_KEY)." },
      { status: 503 },
    );

  const body = (await req.json().catch(() => null)) as { planId?: string } | null;
  const planId = body?.planId;
  if (!planId) return NextResponse.json({ error: "no plan" }, { status: 400 });

  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("coaching_plans")
    .select("*")
    .eq("id", planId)
    .maybeSingle();
  if (!plan) return NextResponse.json({ error: "plan not found" }, { status: 404 });

  const { data: rel } = await admin
    .from("coaching_relationships")
    .select("id, coach_id")
    .eq("id", plan.relationship_id)
    .maybeSingle();
  if (!rel || rel.coach_id !== user.id)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const since = plan.activated_at ?? plan.created_at;

  // Current prescription.
  const { data: workouts } = await admin
    .from("coaching_plan_workouts")
    .select("weekday, title, kind, detail, exercises")
    .eq("plan_id", planId)
    .order("weekday");

  // Logged workouts + sets since the plan started.
  const { data: wlogs } = await admin
    .from("coaching_workout_logs")
    .select("id, title, effort, day")
    .eq("relationship_id", rel.id)
    .gte("day", String(since).slice(0, 10));
  const logIds = (wlogs ?? []).map((w) => w.id);
  const setsByExercise = new Map<string, { weight: number; reps: number | null }[]>();
  if (logIds.length > 0) {
    const { data: sets } = await admin
      .from("coaching_exercise_sets")
      .select("exercise_name, weight, reps, workout_log_id")
      .in("workout_log_id", logIds);
    for (const s of (sets ?? []) as {
      exercise_name: string;
      weight: number | null;
      reps: number | null;
    }[]) {
      if (s.weight == null) continue;
      const arr = setsByExercise.get(s.exercise_name) ?? [];
      arr.push({ weight: Number(s.weight), reps: s.reps });
      setsByExercise.set(s.exercise_name, arr);
    }
  }
  const perExercise = [...setsByExercise.entries()].map(([name, arr]) => {
    const top = arr.reduce((a, b) => (b.weight > a.weight ? b : a), arr[0]);
    return `${name}: top set ${top.weight}${top.reps != null ? `×${top.reps}` : ""}`;
  });
  const efforts = (wlogs ?? [])
    .map((w) => w.effort)
    .filter(Boolean) as string[];

  // Weight trend (from the Weight tracker entries).
  const { data: wt } = await admin
    .from("coaching_trackers")
    .select("id")
    .eq("relationship_id", rel.id)
    .eq("label", "Weight")
    .maybeSingle();
  let weightLine = "no weigh-ins";
  if (wt) {
    const { data: we } = await admin
      .from("coaching_entries")
      .select("amount, happened_at")
      .eq("tracker_id", wt.id)
      .gte("happened_at", String(since))
      .order("happened_at", { ascending: true });
    const vals = (we ?? [])
      .map((e) => Number(e.amount))
      .filter((n) => Number.isFinite(n));
    if (vals.length >= 1) {
      const first = vals[0];
      const last = vals[vals.length - 1];
      weightLine = `${first} → ${last} lb (${vals.length} weigh-ins)`;
    }
  }

  // Adherence: distinct days with any entry since the plan started.
  const { data: ents } = await admin
    .from("coaching_entries")
    .select("happened_at")
    .eq("relationship_id", rel.id)
    .gte("happened_at", String(since));
  const dayset = new Set(
    (ents ?? []).map((e) => String(e.happened_at).slice(0, 10)),
  );

  const prompt =
    "You are the client's fitness coach building NEXT week from how they " +
    "actually performed. Return ONLY valid JSON (no prose, no code fences).\n\n" +
    `This week (week ${plan.week_number}) targets: ${plan.calorie_target ?? "?"} cal, ` +
    `${plan.protein_target ?? "?"}g protein. Goal weight: ${plan.goal_weight ?? "?"}.\n` +
    `Weight trend: ${weightLine}.\n` +
    `Days logged: ${dayset.size}/7. Workouts logged: ${(wlogs ?? []).length}. ` +
    `Effort ratings: ${efforts.join(", ") || "none"}.\n` +
    `Top sets logged:\n${perExercise.join("\n") || "none logged"}\n\n` +
    `Current weekly workouts:\n${JSON.stringify(workouts ?? [])}\n\n` +
    "Rules: progress each lift ~2.5-5% (or a few lbs) where they hit the reps " +
    "and effort was 'easy'/'right'; hold or slightly deload where 'hard' or reps " +
    "were missed. Keep the weekly structure unless adherence was poor (< 4 days) — " +
    "then simplify to rebuild consistency. Adjust calorie/macro targets if weight " +
    "isn't trending toward the goal. Keep protein high.\n\n" +
    "FORMATTING (renders on a phone — keep it clean):\n" +
    "- title: session focus in 2-4 words. NO weekday, NO numbering.\n" +
    "- detail: ONE short line (<= 14 words); don't restate the segments.\n" +
    "- exercises[].name: SHORT label only (a lift name, or a run segment like " +
    "'Warm-up'/'Intervals'/'Cool-down'). NEVER put sets/reps/distance/pace in the " +
    "name or parentheses.\n" +
    "- LIFTS: sets = integer, reps = number or range ('8' / '8-10').\n" +
    "- RUN/CARDIO: sets = 1, put the whole prescription in reps " +
    "(e.g. '3x1 mile @ 10K pace, 90s jog'). \n\n" +
    'Shape: {"summary":string,"diet_notes":string,"calorie_target":int,' +
    '"protein_target":int,"carbs_target":int,"fat_target":int,"water_target":int,' +
    '"example_day":[{"meal":string,"detail":string,"calories":int,"protein_g":int}],' +
    '"workouts":[{"weekday":1-7,"title":string,"kind":"lift"|"run"|"cardio"|"rest"|"other",' +
    '"detail":string,"exercises":[{"name":string,"sets":int,"reps":string,"cue":string}]}]}. ' +
    "Include all 7 weekdays.";

  const model = process.env.PLAN_MODEL || "claude-haiku-4-5-20251001";
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    return NextResponse.json(
      { error: "generation failed", detail: detail.slice(0, 200) },
      { status: 502 },
    );
  }
  const data = (await resp.json()) as { content?: { type: string; text?: string }[] };
  const raw = data.content?.find((c) => c.type === "text")?.text ?? "";
  const next = extractJson(raw);
  if (!next)
    return NextResponse.json({ error: "couldn't read the plan" }, { status: 502 });

  const { data: created, error: pErr } = await admin
    .from("coaching_plans")
    .insert({
      relationship_id: rel.id,
      client_id: plan.client_id,
      week_number: (plan.week_number ?? 1) + 1,
      status: "draft",
      summary: next.summary ?? null,
      diet_notes: next.diet_notes ?? null,
      calorie_target: intOrNull(next.calorie_target),
      protein_target: intOrNull(next.protein_target),
      carbs_target: intOrNull(next.carbs_target),
      fat_target: intOrNull(next.fat_target),
      water_target: intOrNull(next.water_target),
      example_day: Array.isArray(next.example_day) ? next.example_day : null,
      train_days: plan.train_days,
      habits: plan.habits,
    })
    .select("id")
    .single();
  if (pErr || !created)
    return NextResponse.json({ error: pErr?.message ?? "save failed" }, { status: 500 });

  const newId = created.id as string;
  const wks = Array.isArray(next.workouts) ? next.workouts : [];
  if (wks.length > 0) {
    await admin.from("coaching_plan_workouts").insert(
      wks.map((w: Record<string, unknown>, i: number) => ({
        plan_id: newId,
        weekday: Number(w.weekday) || i + 1,
        title: String(w.title ?? "Workout"),
        kind: String(w.kind ?? "other"),
        detail: w.detail ? String(w.detail) : null,
        exercises: Array.isArray(w.exercises) ? w.exercises : null,
        sort_order: Number(w.weekday) || i + 1,
      })),
    );
  }

  return NextResponse.json({ planId: newId });
}

function intOrNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}
function extractJson(s: string): Record<string, unknown> | null {
  try {
    return JSON.parse(s);
  } catch {
    /* slice */
  }
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a >= 0 && b > a) {
    try {
      return JSON.parse(s.slice(a, b + 1));
    } catch {
      /* give up */
    }
  }
  return null;
}
