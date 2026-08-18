import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Rework TODAY'S workout from the client's own words ("knee's sore, only 40 min")
// plus where they are in the plan. Returns a PROPOSAL only — the client previews
// it and saves the adjustment themselves. The weekly plan is never touched.
export async function POST(req: Request) {
  const user = await verifyBearer(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key)
    return NextResponse.json(
      { error: "Adjustments aren't set up (add ANTHROPIC_API_KEY)." },
      { status: 503 },
    );

  const body = (await req.json().catch(() => null)) as {
    relationshipId?: string;
    planWorkoutId?: string | null;
    note?: string;
  } | null;
  const relationshipId = body?.relationshipId;
  const note = (body?.note ?? "").trim();
  if (!relationshipId) return NextResponse.json({ error: "no relationship" }, { status: 400 });
  if (!note) return NextResponse.json({ error: "Tell us what to change first." }, { status: 400 });

  const admin = createAdminClient();

  // The client must own this relationship.
  const { data: rel } = await admin
    .from("coaching_relationships")
    .select("id, client_id")
    .eq("id", relationshipId)
    .maybeSingle();
  if (!rel || rel.client_id !== user.id)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // The prescribed workout we're adjusting (if any).
  let prescribed: Record<string, unknown> | null = null;
  if (body?.planWorkoutId) {
    const { data: w } = await admin
      .from("coaching_plan_workouts")
      .select("title, kind, detail, exercises")
      .eq("id", body.planWorkoutId)
      .maybeSingle();
    prescribed = w ?? null;
  }

  // A little plan context so the rework respects the goal + week.
  const { data: plan } = await admin
    .from("coaching_plans")
    .select("week_number, summary, goal_weight")
    .eq("relationship_id", relationshipId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prompt =
    "You are the client's coach adapting TODAY'S workout to how they feel right " +
    "now. Return ONLY valid JSON (no prose, no code fences).\n\n" +
    `Plan context: week ${plan?.week_number ?? "?"}. ${plan?.summary ?? ""}\n` +
    `Today's prescribed workout: ${prescribed ? JSON.stringify(prescribed) : "none — build something sensible"}\n\n` +
    `The client just said: "${note}"\n\n` +
    "Rework the session to honor what they said (soreness, time, energy, " +
    "equipment, mood) while keeping it useful toward their goal. If they're " +
    "hurt, lower impact / avoid the aggravating movement. If they're short on " +
    "time, trim volume and keep the highest-value work. Keep it realistic. Then " +
    "write a ONE-sentence 'reason' explaining the change in plain, encouraging " +
    "language.\n\n" +
    "FORMATTING (renders on a phone): title = 2-4 words; detail = one short line; " +
    "exercise names are SHORT labels with NO sets/reps/pace inside them. LIFTS: " +
    "sets = integer, reps = number/range. RUN/CARDIO: sets = 1 and put the whole " +
    "prescription in reps (e.g. '4 miles easy').\n\n" +
    'Shape: {"title":string,"kind":"lift"|"run"|"cardio"|"rest"|"other",' +
    '"detail":string,"reason":string,' +
    '"exercises":[{"name":string,"sets":int,"reps":string,"cue":string}]}';

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
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    return NextResponse.json(
      { error: "adjustment failed", detail: detail.slice(0, 200) },
      { status: 502 },
    );
  }
  const data = (await resp.json()) as { content?: { type: string; text?: string }[] };
  const raw = data.content?.find((c) => c.type === "text")?.text ?? "";
  const out = extractJson(raw);
  if (!out) return NextResponse.json({ error: "couldn't read the result" }, { status: 502 });

  return NextResponse.json({
    title: typeof out.title === "string" ? out.title : "Adjusted workout",
    kind: typeof out.kind === "string" ? out.kind : "other",
    detail: typeof out.detail === "string" ? out.detail : null,
    reason: typeof out.reason === "string" ? out.reason : null,
    exercises: Array.isArray(out.exercises) ? out.exercises : [],
  });
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
