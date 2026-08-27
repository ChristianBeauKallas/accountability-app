import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Manage your own personal-development habit trackers: add new ones, edit them
// (label/emoji/days, and whether logging asks for a note or photo), or remove
// them. Guarded so the core Workout/Meals/Water/Weight/Selfie trackers can't be
// edited or deleted here. Works for the client (their own plan) or their coach.
export async function POST(req: Request) {
  const user = await verifyBearer(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    action?: "create" | "update" | "delete";
    id?: string;
    relationshipId?: string;
    label?: string;
    emoji?: string | null;
    wants_note?: boolean;
    wants_photo?: boolean;
    days?: number[] | null;
  } | null;
  if (!body?.action) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const admin = createAdminClient();

  // May this user manage trackers on a relationship? (client or coach of it)
  async function canManage(relId: string): Promise<boolean> {
    const { data } = await admin
      .from("coaching_relationships")
      .select("coach_id, client_id")
      .eq("id", relId)
      .maybeSingle();
    return !!data && (data.coach_id === user!.id || data.client_id === user!.id);
  }

  // Core trackers that power the fixed zones — never editable/deletable here.
  const isSystem = (t: { label: string; wants_macros?: boolean; unit?: string | null }) => {
    const l = (t.label ?? "").toLowerCase();
    return (
      !!t.wants_macros ||
      t.unit === "oz" ||
      /workout|exercise|training|\blift\b|\brun\b|cardio|meal|eat|food|nutrition|breakfast|lunch|dinner|snack|water|drink|hydrat|weight|scale|weigh|selfie|progress|photo/.test(
        l,
      )
    );
  };

  const cleanDays = (d: number[] | null | undefined) =>
    Array.isArray(d) && d.length > 0 && d.length < 7
      ? [...new Set(d.filter((n) => n >= 1 && n <= 7))].sort()
      : null; // null/empty = every day

  if (body.action === "create") {
    const relId = body.relationshipId;
    const label = (body.label ?? "").trim();
    if (!relId || !label)
      return NextResponse.json({ error: "name required" }, { status: 400 });
    if (!(await canManage(relId)))
      return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const { data: last } = await admin
      .from("coaching_trackers")
      .select("sort_order")
      .eq("relationship_id", relId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sort_order = ((last?.sort_order as number) ?? 0) + 1;

    const { data: created, error } = await admin
      .from("coaching_trackers")
      .insert({
        relationship_id: relId,
        label,
        emoji: body.emoji || "✅",
        wants_note: body.wants_note ?? true,
        wants_photo: !!body.wants_photo,
        days: cleanDays(body.days),
        active: true,
        sort_order,
      })
      .select("id")
      .single();
    if (error || !created)
      return NextResponse.json({ error: error?.message ?? "save failed" }, { status: 500 });
    return NextResponse.json({ ok: true, id: created.id });
  }

  // update / delete need an existing tracker.
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { data: t } = await admin
    .from("coaching_trackers")
    .select("id, relationship_id, label, wants_macros, unit")
    .eq("id", body.id)
    .maybeSingle();
  if (!t) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await canManage(t.relationship_id as string)))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (isSystem(t as { label: string; wants_macros?: boolean; unit?: string | null }))
    return NextResponse.json(
      { error: "that one's part of your core plan and can't be changed here" },
      { status: 400 },
    );

  if (body.action === "delete") {
    // Soft-delete so past logs/recaps stay intact.
    const { error } = await admin
      .from("coaching_trackers")
      .update({ active: false })
      .eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // update
  const patch: Record<string, unknown> = {};
  if (typeof body.label === "string" && body.label.trim()) patch.label = body.label.trim();
  if (body.emoji !== undefined) patch.emoji = body.emoji || "✅";
  if (body.wants_note !== undefined) patch.wants_note = body.wants_note;
  if (body.wants_photo !== undefined) patch.wants_photo = body.wants_photo;
  if (body.days !== undefined) patch.days = cleanDays(body.days);
  const { error } = await admin.from("coaching_trackers").update(patch).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
