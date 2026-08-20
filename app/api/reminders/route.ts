import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDate } from "@/lib/streaks";
import { vapidSubject } from "@/lib/vapid";
import { sendPushToUsers, pushConfigured } from "@/lib/push-server";

export const runtime = "nodejs";

// Hourly plan reminders. Two kinds, both timezone-aware and self-deduping
// (each nudge fires at exactly one local hour, so an hourly cron sends it once):
//   • Meal nudges — at breakfast/lunch/dinner, if the person hasn't logged
//     enough meals yet, remind them (personal, never called out to the group).
//   • Dead-group — at night, if NOBODY in the group has checked in all day,
//     nudge every member to be the first.
//
// Wire this to an hourly scheduler (pg_cron/pg_net or cron-job.org). If
// CRON_SECRET is set, callers must send `Authorization: Bearer <secret>`.
export async function GET(req: Request) {
  if (!pushConfigured())
    return NextResponse.json({ ok: false, error: "not configured" }, { status: 503 });

  if (process.env.CRON_SECRET) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${process.env.CRON_SECRET}`)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  // Only people who enabled notifications are reachable.
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("user_id");
  const notifUsers = [...new Set((subs ?? []).map((s) => s.user_id as string))];
  if (notifUsers.length === 0)
    return NextResponse.json({ ok: true, mealNudges: 0, deadGroup: 0 });

  const [{ data: profs }, { data: members }] = await Promise.all([
    admin.from("profiles").select("id, timezone").in("id", notifUsers),
    admin.from("group_members").select("user_id, group_id"),
  ]);

  const tzByUser = new Map(
    (profs ?? []).map((p) => [p.id as string, (p.timezone as string) ?? "America/New_York"]),
  );
  // group → all member user_ids (whole group, not just notif-enabled).
  const groupMembers = new Map<string, string[]>();
  // user → their group_ids (usually one).
  const userGroups = new Map<string, string[]>();
  for (const m of members ?? []) {
    const g = m.group_id as string;
    const u = m.user_id as string;
    groupMembers.set(g, [...(groupMembers.get(g) ?? []), u]);
    userGroups.set(u, [...(userGroups.get(u) ?? []), g]);
  }

  // Today's plan recaps across all groups (last ~40h covers every timezone).
  const since = new Date(now.getTime() - 40 * 60 * 60 * 1000).toISOString();
  const { data: recaps } = await admin
    .from("group_posts")
    .select("author_id, group_id, day, plan_items, created_at")
    .eq("source", "plan")
    .gte("created_at", since);

  const localHour = (tz: string) =>
    Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "numeric",
        hour12: false,
      }).format(now),
    );

  // ---- Meal nudges (personal) ----
  // Fire windows: breakfast 9am (0 meals), lunch 1pm (≤1 meal), dinner 7pm (≤2).
  const MEAL_WINDOWS: { hour: number; max: number; tag: string; title: string; body: string }[] = [
    {
      hour: 9,
      max: 0,
      tag: "breakfast",
      title: "Log your breakfast 🍳",
      body: "Start the day strong — snap your first meal.",
    },
    {
      hour: 13,
      max: 1,
      tag: "lunch",
      title: "Lunch check-in 🥗",
      body: "Haven't logged much yet — take a photo of your lunch.",
    },
    {
      hour: 19,
      max: 2,
      tag: "dinner",
      title: "Dinner check-in 🍽️",
      body: "Close out your meals for the day — log dinner.",
    },
  ];

  let mealNudges = 0;
  for (const uid of notifUsers) {
    const tz = tzByUser.get(uid) ?? "America/New_York";
    const hour = localHour(tz);
    const win = MEAL_WINDOWS.find((w) => w.hour === hour);
    if (!win) continue;
    const today = localDate(now, tz);

    // Their recap for today (if any) → how many meals logged.
    const mine = (recaps ?? []).find(
      (r) => r.author_id === uid && localDate(r.created_at as string, tz) === today,
    );
    const mealsCount =
      ((mine?.plan_items as { meals?: { count?: number } | null } | undefined)
        ?.meals?.count) ?? 0;
    if (mealsCount > win.max) continue;

    const n = await sendPushToUsers(
      [uid],
      { title: win.title, body: win.body, url: "/plan", tag: `meal-${win.tag}-${today}` },
      vapidSubject(req),
    );
    if (n > 0) mealNudges++;
  }

  // ---- Dead-group (group-level, 8pm) ----
  // At each member's local 8pm, if NO ONE in the group has checked in for that
  // member's local day, nudge them to break the silence.
  let deadGroup = 0;
  const handledDead = new Set<string>();
  for (const uid of notifUsers) {
    if (handledDead.has(uid)) continue;
    const tz = tzByUser.get(uid) ?? "America/New_York";
    if (localHour(tz) !== 20) continue;
    const today = localDate(now, tz);

    const groups = userGroups.get(uid) ?? [];
    // Group is "alive" today if anyone in any of the user's groups has a recap.
    const alive = (recaps ?? []).some(
      (r) =>
        groups.includes(r.group_id as string) &&
        localDate(r.created_at as string, tz) === today,
    );
    if (alive) continue;

    handledDead.add(uid);
    const n = await sendPushToUsers(
      [uid],
      {
        title: "The group's been quiet today 👀",
        body: "Nobody's checked in yet — be the one to get it going.",
        url: "/",
        tag: `deadgroup-${today}`,
      },
      vapidSubject(req),
    );
    if (n > 0) deadGroup++;
  }

  return NextResponse.json({ ok: true, mealNudges, deadGroup, checked: notifUsers.length });
}
