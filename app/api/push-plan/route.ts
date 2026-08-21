import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const rotate = (wd: number) => (wd % 7) + 1; // 1..7, +1 with Sun(7)→Mon(1)

// "Push my plan a day": slide the entire recurring program forward one weekday
// so a missed day isn't skipped — today's workout moves to tomorrow, and the
// whole week (workouts + weekday-specific habits) shifts with it. Daily habits
// (every weekday, or no weekday set) are unaffected. Repeatable.
export async function POST(req: Request) {
  const user = await verifyBearer(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // The relationship where this user is the client (their own plan).
  const { data: rel } = await admin
    .from("coaching_relationships")
    .select("id")
    .eq("client_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!rel) return NextResponse.json({ error: "no plan" }, { status: 404 });

  // Active plan.
  const { data: plan } = await admin
    .from("coaching_plans")
    .select("id")
    .eq("relationship_id", rel.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!plan) return NextResponse.json({ error: "no active plan" }, { status: 404 });

  // Rotate every workout's weekday forward one day.
  const { data: workouts } = await admin
    .from("coaching_plan_workouts")
    .select("id, weekday")
    .eq("plan_id", plan.id);
  await Promise.all(
    (workouts ?? []).map((w) =>
      admin
        .from("coaching_plan_workouts")
        .update({ weekday: rotate(w.weekday as number) })
        .eq("id", w.id),
    ),
  );

  // Rotate weekday-specific tracker days too (Mobility, Jiu-jitsu, Workout…),
  // so adherence stays aligned. Daily trackers (all 7 days, or none) are a
  // no-op under rotation.
  const { data: trackers } = await admin
    .from("coaching_trackers")
    .select("id, days")
    .eq("relationship_id", rel.id);
  await Promise.all(
    (trackers ?? [])
      .filter((t) => Array.isArray(t.days) && (t.days as number[]).length > 0)
      .map((t) =>
        admin
          .from("coaching_trackers")
          .update({ days: (t.days as number[]).map(rotate) })
          .eq("id", t.id),
      ),
  );

  return NextResponse.json({ ok: true });
}
