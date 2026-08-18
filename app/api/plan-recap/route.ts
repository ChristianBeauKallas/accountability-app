import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth-api";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDate } from "@/lib/streaks";

export const runtime = "nodejs";

// Rebuild a client's "plan recap" post in their group feed for one day, from
// their My Plan logs. Auto-included: workouts/runs, meals (+ macros + photos),
// habits. NEVER auto-included: weight numbers, progress selfies (privacy).
export async function POST(req: Request) {
  const user = await verifyBearer(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { day?: string } | null;
  const day = body?.day;
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day))
    return NextResponse.json({ error: "bad day" }, { status: 400 });

  const admin = createAdminClient();

  // The relationship where this user is the client.
  const { data: rel } = await admin
    .from("coaching_relationships")
    .select("id")
    .eq("client_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!rel) return NextResponse.json({ ok: true, skipped: "no plan" });

  // Which group's feed does this land in?
  const { data: gm } = await admin
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!gm) return NextResponse.json({ ok: true, skipped: "no group" });
  const groupId = gm.group_id as string;

  const { data: prof } = await admin
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle();
  const tz = prof?.timezone ?? "America/New_York";

  const { data: trackers } = await admin
    .from("coaching_trackers")
    .select("id, label, emoji, wants_macros")
    .eq("relationship_id", rel.id);
  const trackerById = new Map(
    (trackers ?? []).map((t) => [t.id as string, t]),
  );
  const isPrivate = (label: string) =>
    /weight|scale|weigh|selfie|progress|photo/i.test(label);

  // The day's entries (filter a small window by the member's local day).
  const from = new Date(day + "T00:00:00Z");
  from.setUTCDate(from.getUTCDate() - 1);
  const to = new Date(day + "T00:00:00Z");
  to.setUTCDate(to.getUTCDate() + 2);
  const { data: rawEntries } = await admin
    .from("coaching_entries")
    .select("id, tracker_id, happened_at, detail, amount, calories, protein_g")
    .eq("relationship_id", rel.id)
    .gte("happened_at", from.toISOString())
    .lt("happened_at", to.toISOString());
  const entries = (rawEntries ?? []).filter(
    (e) => localDate(e.happened_at as string, tz) === day,
  );

  // Logged workout (actual session).
  const { data: wlog } = await admin
    .from("coaching_workout_logs")
    .select("title, effort")
    .eq("relationship_id", rel.id)
    .eq("day", day)
    .maybeSingle();

  // Active plan targets.
  const { data: plan } = await admin
    .from("coaching_plans")
    .select("calorie_target, protein_target")
    .eq("relationship_id", rel.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // ---- Build the recap ----
  const workouts: { title: string; effort: string | null }[] = [];
  if (wlog) workouts.push({ title: wlog.title as string, effort: (wlog.effort as string) ?? null });

  const mealEntryIds: string[] = [];
  const meals = { count: 0, calories: 0, protein: 0 };
  const habitMap = new Map<string, { label: string; emoji: string; count: number }>();

  for (const e of entries) {
    const t = trackerById.get(e.tracker_id as string);
    if (!t) continue;
    const label = (t.label as string) ?? "";
    if (isPrivate(label)) continue; // weight + selfies never auto-post
    if (t.wants_macros) {
      meals.count += 1;
      meals.calories += Number(e.calories ?? 0);
      meals.protein += Number(e.protein_g ?? 0);
      mealEntryIds.push(e.id as string);
      continue;
    }
    if (/workout|exercise|training|lift|run|cardio/i.test(label)) continue; // covered by wlog
    const key = label;
    const h = habitMap.get(key) ?? { label, emoji: (t.emoji as string) ?? "✅", count: 0 };
    h.count += 1;
    habitMap.set(key, h);
  }
  const habits = [...habitMap.values()];

  const hasSomething =
    workouts.length > 0 || meals.count > 0 || habits.length > 0;

  // Find any existing recap for this person/day.
  const { data: existing } = await admin
    .from("group_posts")
    .select("id")
    .eq("author_id", user.id)
    .eq("day", day)
    .eq("source", "plan")
    .maybeSingle();

  // Nothing shareable left → remove the recap (cascades its media).
  if (!hasSomething) {
    if (existing) await admin.from("group_posts").delete().eq("id", existing.id);
    return NextResponse.json({ ok: true, empty: true });
  }

  const plan_items = {
    workouts,
    meals:
      meals.count > 0
        ? {
            count: meals.count,
            calories: Math.round(meals.calories),
            protein: Math.round(meals.protein),
            target_calories: plan?.calorie_target ?? null,
            target_protein: plan?.protein_target ?? null,
          }
        : null,
    habits,
  };

  // A short caption for the notification/preview line.
  const bits: string[] = [];
  if (workouts[0]) bits.push(workouts[0].title);
  if (meals.count > 0)
    bits.push(
      plan?.calorie_target
        ? `${Math.round(meals.calories)}/${plan.calorie_target} cal`
        : `${meals.count} meal${meals.count > 1 ? "s" : ""}`,
    );
  if (habits.length > 0) bits.push(habits.map((h) => h.label).join(", "));
  const caption = bits.join(" · ") || null;

  let postId: string;
  if (existing) {
    postId = existing.id as string;
    await admin
      .from("group_posts")
      .update({ caption, plan_items })
      .eq("id", postId);
  } else {
    const { data: created, error } = await admin
      .from("group_posts")
      .insert({
        group_id: groupId,
        author_id: user.id,
        caption,
        source: "plan",
        day,
        plan_items,
      })
      .select("id")
      .single();
    if (error || !created)
      return NextResponse.json({ error: error?.message ?? "save failed" }, { status: 500 });
    postId = created.id as string;
  }

  // Bring meal photos into the feed post (a parallel media row pointing at the
  // same file — makes it group-readable without moving/copying the file).
  if (mealEntryIds.length > 0) {
    const { data: mealMedia } = await admin
      .from("media")
      .select("storage_path")
      .in("entry_id", mealEntryIds)
      .eq("type", "image");
    const { data: already } = await admin
      .from("media")
      .select("storage_path")
      .eq("post_id", postId);
    const have = new Set((already ?? []).map((m) => m.storage_path as string));
    const toAdd = (mealMedia ?? [])
      .map((m) => m.storage_path as string)
      .filter((p) => !have.has(p));
    if (toAdd.length > 0) {
      await admin.from("media").insert(
        toAdd.map((storage_path) => ({
          owner_id: user.id,
          type: "image",
          storage_path,
          post_id: postId,
        })),
      );
    }
  }

  return NextResponse.json({ ok: true, postId });
}
