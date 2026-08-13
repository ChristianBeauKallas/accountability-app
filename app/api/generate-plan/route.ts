import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function cadenceToDays(cadence: string): number[] {
  const c = (cadence || "").toLowerCase();
  if (c.includes("weekday")) return [1, 2, 3, 4, 5];
  if (c.includes("weekend")) return [6, 7];
  if (c.includes("daily")) return [1, 2, 3, 4, 5, 6, 7];
  const m = c.match(/(\d)\s*[x×]/);
  if (m) {
    const spread: Record<number, number[]> = {
      1: [3],
      2: [1, 4],
      3: [1, 3, 5],
      4: [1, 2, 4, 6],
      5: [1, 2, 3, 4, 5],
      6: [1, 2, 3, 4, 5, 6],
    };
    return spread[Number(m[1])] ?? [1, 3, 5];
  }
  return [1, 2, 3, 4, 5, 6, 7];
}

const DOW = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export async function POST(req: Request) {
  const user = await verifyBearer(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key)
    return NextResponse.json(
      { error: "Plan generation isn't set up (add ANTHROPIC_API_KEY)." },
      { status: 503 },
    );

  const body = (await req.json().catch(() => null)) as { intakeId?: string } | null;
  const intakeId = body?.intakeId;
  if (!intakeId) return NextResponse.json({ error: "no intake" }, { status: 400 });

  const admin = createAdminClient();
  const { data: intake } = await admin
    .from("coaching_intakes")
    .select("*")
    .eq("id", intakeId)
    .maybeSingle();
  if (!intake) return NextResponse.json({ error: "intake not found" }, { status: 404 });

  const { data: rel } = await admin
    .from("coaching_relationships")
    .select("id, coach_id")
    .eq("id", intake.relationship_id)
    .maybeSingle();
  if (!rel || rel.coach_id !== user.id)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const trainDays: number[] = intake.train_days ?? [];
  const trainNames = trainDays.map((d: number) => DOW[d]).join(", ");
  const habits = (intake.habits ?? []) as { name: string; cadence: string }[];

  const prompt =
    "You are an expert fitness + nutrition coach. Build ONE WEEK of a training + " +
    "nutrition plan for this client. Return ONLY valid JSON (no prose, no code " +
    "fences).\n\n" +
    `Client intake:\n` +
    `- Goals: ${intake.goals ?? "n/a"}\n` +
    `- Weight: ${intake.current_weight ?? "?"} lb → goal ${intake.goal_weight ?? "?"} lb\n` +
    `- Build: ${intake.build ?? "?"}; Height: ${intake.height ?? "?"}; Age: ${intake.age ?? "?"}\n` +
    `- Activity level (0-5): ${intake.activity_level ?? "?"}; Diet discipline (0-5): ${intake.diet_level ?? "?"}\n` +
    `- Diet type: ${intake.diet_type ?? "none"}; Maintenance calories: ${intake.maintenance_calories ?? "estimate it"}\n` +
    `- Trains on: ${trainNames || "flexible"} (ISO weekdays ${JSON.stringify(trainDays)})\n` +
    `- Workout types they chose: ${(intake.workout_types ?? []).join(", ") || "any"}\n\n` +
    "Rules: set daily calorie + macro targets appropriate for the goal (deficit " +
    "to lose, surplus to gain) anchored to maintenance; keep protein high. Water " +
    "target in oz. Prescribe REAL workouts ONLY on their training weekdays, matched " +
    "to their activity level and chosen types. Non-training days are kind:'rest'. " +
    "Give a 4-item example day fitting their diet type.\n\n" +
    "FORMATTING (keep it clean — this renders on a phone):\n" +
    "- title: the session focus in 2-4 words only. NO weekday, NO numbering. " +
    "Good: 'Intervals / Tempo', 'Upper body'. Bad: 'Wednesday – Run 2 (Intervals)'.\n" +
    "- detail: ONE short line (<= 14 words) on the session's aim. Do NOT restate " +
    "every segment/exercise below it.\n" +
    "- exercises[].name: a SHORT label only — a lift name ('Bench press') or a run " +
    "segment ('Warm-up','Intervals','Tempo','Cool-down'). NEVER put sets, reps, " +
    "distance, or pace inside the name or in parentheses.\n" +
    "- LIFTS: sets = integer (e.g. 4), reps = a number or range string (e.g. '8' " +
    "or '8-10').\n" +
    "- RUN/CARDIO segments: set sets = 1 and put the WHOLE prescription in reps " +
    "(e.g. '2 miles easy' or '3x1 mile @ 10K pace, 90s jog recovery'). Keep the " +
    "name to the segment label.\n" +
    "- cue: one short optional form/effort tip.\n\n" +
    'Shape: {"summary":string,"diet_notes":string,"calorie_target":int,' +
    '"protein_target":int,"carbs_target":int,"fat_target":int,"water_target":int,' +
    '"example_day":[{"meal":string,"detail":string,"calories":int,"protein_g":int}],' +
    '"workouts":[{"weekday":1-7,"title":string,"kind":"lift"|"run"|"cardio"|"rest"|"other",' +
    '"detail":string,"exercises":[{"name":string,"sets":int,"reps":string,"cue":string}]}]}. ' +
    "Include all 7 weekdays in workouts (rest days too).";

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
  const plan = extractJson(raw);
  if (!plan)
    return NextResponse.json({ error: "couldn't read the plan" }, { status: 502 });

  // Next week number.
  const { data: prev } = await admin
    .from("coaching_plans")
    .select("week_number")
    .eq("relationship_id", rel.id)
    .order("week_number", { ascending: false })
    .limit(1);
  const week = ((prev?.[0]?.week_number as number) ?? 0) + 1;

  const resolvedHabits = habits.map((h) => ({
    name: h.name,
    days: cadenceToDays(h.cadence),
  }));

  const { data: created, error: pErr } = await admin
    .from("coaching_plans")
    .insert({
      relationship_id: rel.id,
      client_id: intake.client_id,
      week_number: week,
      status: "draft",
      summary: plan.summary ?? null,
      diet_notes: plan.diet_notes ?? null,
      calorie_target: intOrNull(plan.calorie_target),
      protein_target: intOrNull(plan.protein_target),
      carbs_target: intOrNull(plan.carbs_target),
      fat_target: intOrNull(plan.fat_target),
      water_target: intOrNull(plan.water_target),
      example_day: Array.isArray(plan.example_day) ? plan.example_day : null,
      train_days: trainDays.length ? trainDays : null,
      habits: resolvedHabits.length ? resolvedHabits : null,
    })
    .select("id")
    .single();
  if (pErr || !created)
    return NextResponse.json({ error: pErr?.message ?? "save failed" }, { status: 500 });

  const planId = created.id as string;
  const workouts = Array.isArray(plan.workouts) ? plan.workouts : [];
  if (workouts.length > 0) {
    await admin.from("coaching_plan_workouts").insert(
      workouts.map((w: Record<string, unknown>, i: number) => ({
        plan_id: planId,
        weekday: Number(w.weekday) || i + 1,
        title: String(w.title ?? "Workout"),
        kind: String(w.kind ?? "other"),
        detail: w.detail ? String(w.detail) : null,
        exercises: Array.isArray(w.exercises) ? w.exercises : null,
        sort_order: Number(w.weekday) || i + 1,
      })),
    );
  }

  return NextResponse.json({ planId });
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
