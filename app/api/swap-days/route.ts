import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Swap two weekdays in the plan: the workouts on dayA and dayB trade places,
// and any weekday-specific habits move with them (a Tuesday habit follows
// Tuesday's session). Lets you rearrange the week — e.g. swap tempo & long run,
// or move a rest day — without touching the rest of the schedule.
export async function POST(req: Request) {
  const user = await verifyBearer(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { dayA?: number; dayB?: number } | null;
  const a = body?.dayA;
  const b = body?.dayB;
  if (!a || !b || a === b || a < 1 || a > 7 || b < 1 || b > 7)
    return NextResponse.json({ error: "bad days" }, { status: 400 });

  const admin = createAdminClient();

  // The relationship where this user is the client (their own plan).
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

  // Swap the two weekdays on the plan's workouts.
  const { data: workouts } = await admin
    .from("coaching_plan_workouts")
    .select("id, weekday")
    .eq("plan_id", plan.id)
    .in("weekday", [a, b]);
  await Promise.all(
    (workouts ?? []).map((w) =>
      admin
        .from("coaching_plan_workouts")
        .update({ weekday: (w.weekday as number) === a ? b : a })
        .eq("id", w.id),
    ),
  );

  // Move weekday-specific habits with their day.
  const { data: trackers } = await admin
    .from("coaching_trackers")
    .select("id, days")
    .eq("relationship_id", rel.id);
  await Promise.all(
    (trackers ?? [])
      .filter((t) => Array.isArray(t.days) && (t.days as number[]).length > 0)
      .map((t) => {
        const days = (t.days as number[]).map((d) => (d === a ? b : d === b ? a : d));
        return admin.from("coaching_trackers").update({ days }).eq("id", t.id);
      }),
  );

  return NextResponse.json({ ok: true });
}
