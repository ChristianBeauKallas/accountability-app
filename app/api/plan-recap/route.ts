import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth-api";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDate } from "@/lib/streaks";
import { sendPushToUsers } from "@/lib/push-server";
import { vapidSubject } from "@/lib/vapid";

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
    .select("id, label, emoji, wants_macros, days, active")
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
  const workoutEntryIds: string[] = [];
  const meals = { count: 0, calories: 0, protein: 0 };
  const water = { oz: 0, unit: "oz" };
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
    // Water gets its own amount-based line, not a habit checkmark.
    if (/water|drink|hydrat/i.test(label) || (t as { unit?: string }).unit === "oz") {
      water.oz += Number(e.amount ?? 0);
      water.unit = ((t as { unit?: string }).unit as string) ?? "oz";
      continue;
    }
    if (/workout|exercise|training|lift|run|cardio/i.test(label)) {
      // Covered by wlog, but keep the entry id so any run screenshot posts.
      workoutEntryIds.push(e.id as string);
      continue;
    }
    const key = label;
    const h = habitMap.get(key) ?? { label, emoji: (t.emoji as string) ?? "✅", count: 0 };
    h.count += 1;
    habitMap.set(key, h);
  }
  const habits = [...habitMap.values()];

  const hasSomething =
    workouts.length > 0 || meals.count > 0 || habits.length > 0;

  // Real completion: of everything DUE today (incl. private weight/selfie),
  // how much has been logged? "Win" only when it's all done.
  const wd = new Date(day + "T12:00:00").getDay();
  const isoWd = wd === 0 ? 7 : wd;
  const loggedTrackerIds = new Set(entries.map((e) => e.tracker_id as string));
  const dueToday = (trackers ?? []).filter((t) => {
    if (t.active === false) return false;
    const days = (t.days as number[] | null) ?? [];
    return days.length === 0 || days.includes(isoWd);
  });
  const satisfied = dueToday.filter((t) => loggedTrackerIds.has(t.id as string)).length;
  const progress = dueToday.length > 0 ? satisfied / dueToday.length : hasSomething ? 1 : 0;
  const complete = dueToday.length > 0 && satisfied >= dueToday.length;

  // Find any existing recap for this person/day.
  const { data: existing } = await admin
    .from("group_posts")
    .select("id, plan_items, notified_at")
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
    progress: Math.round(progress * 100) / 100,
    complete,
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
    water: water.oz > 0 ? { oz: Math.round(water.oz), unit: water.unit } : null,
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
  if (water.oz > 0) bits.push(`${Math.round(water.oz)} ${water.unit} water`);
  if (habits.length > 0) bits.push(habits.map((h) => h.label).join(", "));
  const caption = bits.join(" · ") || null;

  let postId: string;
  if (existing) {
    postId = existing.id as string;
    // Bump to the top of the feed on every log.
    await admin
      .from("group_posts")
      .update({ caption, plan_items, updated_at: new Date().toISOString() })
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

  // Bring meal + run photos into the feed post (a parallel media row pointing
  // at the same file — makes it group-readable without moving/copying it).
  const photoEntryIds = [...mealEntryIds, ...workoutEntryIds];
  if (photoEntryIds.length > 0) {
    const { data: mealMedia } = await admin
      .from("media")
      .select("storage_path")
      .in("entry_id", photoEntryIds)
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

  // ---- Notify the group (milestones + throttle) ----
  // We push on three moments: the day's FIRST recap in the whole group
  // (kickoff), a person's OWN first recap of the day, and when they finish a
  // workout. Any later log only re-pings if it's been >30 min since the last
  // push for this recap — so "bump every log" doesn't spam everyone.
  try {
    await maybeNotify({
      admin,
      req,
      groupId,
      authorId: user.id,
      day,
      caption,
      isNewPost: !existing,
      prevWorkouts: (existing?.plan_items as { workouts?: unknown[] } | null)
        ?.workouts?.length ?? 0,
      nowWorkouts: workouts.length,
      lastNotifiedAt: (existing?.notified_at as string | null) ?? null,
      postId,
    });
  } catch {
    // Never let a push failure break the log write.
  }

  return NextResponse.json({ ok: true, postId });
}

async function maybeNotify(args: {
  admin: ReturnType<typeof createAdminClient>;
  req: Request;
  groupId: string;
  authorId: string;
  day: string;
  caption: string | null;
  isNewPost: boolean;
  prevWorkouts: number;
  nowWorkouts: number;
  lastNotifiedAt: string | null;
  postId: string;
}) {
  const {
    admin,
    req,
    groupId,
    authorId,
    day,
    caption,
    isNewPost,
    prevWorkouts,
    nowWorkouts,
    lastNotifiedAt,
    postId,
  } = args;

  const workoutJustDone = nowWorkouts > prevWorkouts;

  // 30-minute throttle: skip a re-ping unless a milestone forces it.
  const throttled =
    !!lastNotifiedAt &&
    Date.now() - new Date(lastNotifiedAt).getTime() < 30 * 60 * 1000;

  // Only push on a milestone, or on a non-throttled update.
  const milestone = isNewPost || workoutJustDone;
  if (!milestone && throttled) return;

  // Author name + the rest of the group (recipients).
  const { data: mates } = await admin
    .from("group_members")
    .select("user_id, profiles(display_name)")
    .eq("group_id", groupId);
  const rows = (mates ?? []) as unknown as {
    user_id: string;
    profiles: { display_name: string | null } | { display_name: string | null }[] | null;
  }[];
  const nameOf = (p: (typeof rows)[number]["profiles"]) =>
    (Array.isArray(p) ? p[0]?.display_name : p?.display_name) ?? null;
  const author =
    nameOf(rows.find((r) => r.user_id === authorId)?.profiles ?? null) ??
    "Someone";
  const recipients = rows
    .map((r) => r.user_id)
    .filter((id) => id !== authorId);
  if (recipients.length === 0) return;

  // Is this the FIRST plan recap of the day in the whole group?
  let firstInGroup = false;
  if (isNewPost) {
    const { data: others } = await admin
      .from("group_posts")
      .select("id")
      .eq("group_id", groupId)
      .eq("day", day)
      .eq("source", "plan")
      .neq("author_id", authorId)
      .limit(1);
    firstInGroup = (others ?? []).length === 0;
  }

  let title: string;
  let body: string;
  if (firstInGroup) {
    title = `${author} kicked off the day 🔥`;
    body = caption
      ? `First check-in is up — ${caption}. Who's next?`
      : "First check-in of the day is up. Who's next?";
  } else if (isNewPost) {
    title = `${author} checked in ✅`;
    body = caption ?? "Logged their plan for today.";
  } else if (workoutJustDone) {
    title = `${author} finished a workout 💪`;
    body = caption ?? "Just logged their training.";
  } else {
    title = `${author} added to their day`;
    body = caption ?? "Updated today's plan.";
  }

  await sendPushToUsers(
    recipients,
    { title, body, url: "/", tag: `plan-${authorId}-${day}` },
    vapidSubject(req),
  );

  await admin
    .from("group_posts")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", postId);
}
