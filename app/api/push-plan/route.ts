import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Rotate an ISO weekday (1..7) by dir (+1 = later, -1 = earlier), wrapping.
const rotate = (wd: number, dir: number) => ((wd - 1 + dir + 7) % 7) + 1;

// Slide the entire recurring program by one weekday. direction:
//   +1 ("push")  → everything moves a day LATER  (missed today → do it tomorrow)
//   -1 ("skip")  → everything moves a day EARLIER (skip a rest day, catch up)
// Workouts + weekday-specific habits shift together; daily habits are
// unaffected. Repeatable in either direction.
export async function POST(req: Request) {
  const user = await verifyBearer(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { direction?: number } | null;
  const dir = body?.direction === -1 ? -1 : 1;

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

  // Rotate every workout's weekday by the chosen direction.
  const { data: workouts } = await admin
    .from("coaching_plan_workouts")
    .select("id, weekday")
    .eq("plan_id", plan.id);
  await Promise.all(
    (workouts ?? []).map((w) =>
      admin
        .from("coaching_plan_workouts")
        .update({ weekday: rotate(w.weekday as number, dir) })
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
          .update({ days: (t.days as number[]).map((d) => rotate(d, dir)) })
          .eq("id", t.id),
      ),
  );

  return NextResponse.json({ ok: true });
}
