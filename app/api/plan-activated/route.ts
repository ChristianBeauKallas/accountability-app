import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Cleanup after a new plan is activated (a revision / new block). Two safety
// steps that RLS can't do in one client session (adjustments are client-write,
// trackers are coach-write):
//   1. Clear upcoming per-date overrides (swaps, edited days, push/skip), so
//      the new plan shows cleanly from today forward.
//   2. Re-activate the client's own custom habits (source='user'), which
//      activate_plan deactivates because they aren't in the new plan's list.
export async function POST(req: Request) {
  const user = await verifyBearer(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { relationshipId?: string } | null;
  const relId = body?.relationshipId;
  if (!relId) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const admin = createAdminClient();

  // Caller must be part of this relationship (coach or client).
  const { data: rel } = await admin
    .from("coaching_relationships")
    .select("coach_id, client_id")
    .eq("id", relId)
    .maybeSingle();
  if (!rel || (rel.coach_id !== user.id && rel.client_id !== user.id))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const today = new Date().toISOString().slice(0, 10);

  // 1. Clear upcoming overrides.
  await admin
    .from("coaching_workout_adjustments")
    .delete()
    .eq("relationship_id", relId)
    .gte("day", today);

  // 2. Preserve the client's own habits (best-effort; ignores missing column).
  await admin
    .from("coaching_trackers")
    .update({ active: true })
    .eq("relationship_id", relId)
    .eq("source", "user")
    .then(undefined, () => undefined);

  return NextResponse.json({ ok: true });
}
