import { NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { localDate } from "@/lib/streaks";
import { vapidSubject } from "@/lib/vapid";

export const runtime = "nodejs";

// Daily reminder: nudges members who haven't finished all of today's activities.
// Triggered by a Vercel Cron (see vercel.json). Personal only — each person is
// reminded about their own day, never called out to the group.
export async function GET(req: Request) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, error: "not configured" }, { status: 503 });
  }
  webpush.setVapidDetails(vapidSubject(req), publicKey, privateKey);

  const admin = createAdminClient();
  const now = new Date();

  // Self-test: /api/remind?test=1 while logged in evaluates the CURRENT user's
  // day right now (ignoring the noon guard) and sends them the real reminder,
  // returning a diagnostic. Lets you prove the reminder end-to-end without
  // waiting for 7 PM or pinging the whole group.
  if (new URL(req.url).searchParams.get("test") === "1") {
    return selfTest(req, admin, now);
  }

  // Optional shared secret. Vercel attaches this header automatically when the
  // CRON_SECRET env var is set; if it's unset the endpoint is open.
  if (process.env.CRON_SECRET) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${process.env.CRON_SECRET}`)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Only people who turned notifications on can be reminded.
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, user_id, subscription");
  if (!subs || subs.length === 0)
    return NextResponse.json({ ok: true, reminded: 0 });

  const subsByUser = new Map<
    string,
    { id: string; subscription: unknown }[]
  >();
  for (const s of subs) {
    const arr = subsByUser.get(s.user_id) ?? [];
    arr.push({ id: s.id, subscription: s.subscription });
    subsByUser.set(s.user_id, arr);
  }
  const userIds = [...subsByUser.keys()];

  // Timezones, memberships, active-activity counts, and recent posts.
  const [{ data: profs }, { data: members }, { data: acts }] =
    await Promise.all([
      admin.from("profiles").select("id, timezone").in("id", userIds),
      admin.from("group_members").select("user_id, group_id").in("user_id", userIds),
      admin.from("activities").select("id, group_id").eq("active", true),
    ]);

  const tzByUser = new Map(
    (profs ?? []).map((p) => [p.id, p.timezone ?? "America/New_York"]),
  );
  const activityCountByGroup = new Map<string, number>();
  for (const a of acts ?? [])
    activityCountByGroup.set(
      a.group_id,
      (activityCountByGroup.get(a.group_id) ?? 0) + 1,
    );

  // Posts from the last ~40h covers "today" in every timezone.
  const since = new Date(now.getTime() - 40 * 60 * 60 * 1000).toISOString();
  const { data: posts } = await admin
    .from("group_posts")
    .select("author_id, created_at, post_activities(activity_id)")
    .in("author_id", userIds)
    .gte("created_at", since);

  type Sub = { id: string; subscription: unknown };
  const toSend: { subs: Sub[]; payload: string }[] = [];
  const handled = new Set<string>(); // one reminder per user, even if multi-group

  for (const m of members ?? []) {
    if (handled.has(m.user_id)) continue;
    const required = activityCountByGroup.get(m.group_id) ?? 0;
    if (required === 0) continue;

    const tz = tzByUser.get(m.user_id) ?? "America/New_York";
    const today = localDate(now, tz);
    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "numeric",
        hour12: false,
      }).format(now),
    );
    // Never ping overnight/morning for far-flung timezones.
    if (hour < 12) continue;

    const logged = new Set<string>();
    for (const p of posts ?? []) {
      if (p.author_id !== m.user_id) continue;
      if (localDate(p.created_at, tz) !== today) continue;
      for (const pa of (p.post_activities ?? []) as { activity_id: string }[])
        logged.add(pa.activity_id);
    }
    if (logged.size >= required) continue; // already finished today

    handled.add(m.user_id);
    const remaining = required - logged.size;
    const payload = JSON.stringify({
      title: "Finish your day 💪",
      body:
        logged.size === 0
          ? "You haven't checked in yet — tap to log your day"
          : `Just ${remaining} more to finish today — tap to log`,
      url: "/",
      tag: `remind-${today}`,
    });
    toSend.push({ subs: subsByUser.get(m.user_id) ?? [], payload });
  }

  let reminded = 0;
  await Promise.all(
    toSend.flatMap(({ subs: rows, payload }) =>
      rows.map(async (row) => {
        try {
          await webpush.sendNotification(
            row.subscription as webpush.PushSubscription,
            payload,
          );
          reminded++;
        } catch (e) {
          const code = (e as { statusCode?: number })?.statusCode;
          if (code === 404 || code === 410)
            await admin.from("push_subscriptions").delete().eq("id", row.id);
        }
      }),
    ),
  );

  return NextResponse.json({ ok: true, reminded, checked: userIds.length });
}

// Evaluate + send the reminder for just the logged-in user, right now.
async function selfTest(
  req: Request,
  admin: ReturnType<typeof createAdminClient>,
  now: Date,
) {
  const server = await createServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "not logged in — open this URL inside the app" },
      { status: 401 },
    );
  }

  const [{ data: subs }, { data: prof }, { data: mem }] = await Promise.all([
    admin
      .from("push_subscriptions")
      .select("id, subscription")
      .eq("user_id", user.id),
    admin.from("profiles").select("timezone").eq("id", user.id).maybeSingle(),
    admin.from("group_members").select("group_id").eq("user_id", user.id),
  ]);

  const tz =
    (prof as { timezone: string | null } | null)?.timezone ??
    "America/New_York";
  const groupId = (mem ?? [])[0]?.group_id as string | undefined;

  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    }).format(now),
  );
  const today = localDate(now, tz);

  let required = 0;
  const logged = new Set<string>();
  if (groupId) {
    const { data: acts } = await admin
      .from("activities")
      .select("id")
      .eq("active", true)
      .eq("group_id", groupId);
    required = (acts ?? []).length;

    const since = new Date(
      now.getTime() - 40 * 60 * 60 * 1000,
    ).toISOString();
    const { data: posts } = await admin
      .from("group_posts")
      .select("created_at, post_activities(activity_id)")
      .eq("author_id", user.id)
      .eq("group_id", groupId)
      .gte("created_at", since);
    for (const p of posts ?? []) {
      if (localDate(p.created_at as string, tz) !== today) continue;
      for (const pa of (p.post_activities ?? []) as { activity_id: string }[])
        logged.add(pa.activity_id);
    }
  }

  const remaining = Math.max(0, required - logged.size);
  const finished = required > 0 && logged.size >= required;
  const subRows = (subs ?? []) as { id: string; subscription: unknown }[];

  let sent = 0;
  const results: { ok: boolean; status: number; message?: string }[] = [];
  if (subRows.length > 0 && required > 0 && !finished) {
    const payload = JSON.stringify({
      title: "Finish your day 💪",
      body:
        logged.size === 0
          ? "You haven't checked in yet — tap to log your day"
          : `Just ${remaining} more to finish today — tap to log`,
      url: "/",
      tag: `remind-test-${today}`,
    });
    await Promise.all(
      subRows.map(async (row) => {
        try {
          await webpush.sendNotification(
            row.subscription as webpush.PushSubscription,
            payload,
          );
          sent++;
          results.push({ ok: true, status: 201 });
        } catch (e) {
          const status = (e as { statusCode?: number })?.statusCode ?? 0;
          const message = (e as { body?: string })?.body || String(e);
          if (status === 404 || status === 410)
            await admin.from("push_subscriptions").delete().eq("id", row.id);
          results.push({ ok: false, status, message: message.slice(0, 200) });
        }
      }),
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "self-test",
    timezone: tz,
    localHour: hour,
    firesOnScheduleNow: hour >= 12,
    required,
    loggedToday: logged.size,
    remaining,
    finished,
    devices: subRows.length,
    sent,
    results,
    note: finished
      ? "You've finished today — the scheduled 7 PM reminder would skip you."
      : subRows.length === 0
        ? "No subscribed device on this account — tap the bell to enable notifications in the installed app."
        : sent > 0
          ? "Reminder delivered to your device(s). If no banner appeared, lock the phone (iOS hides banners while the app is open)."
          : "Delivery failed — see results[].status (403 = VAPID mismatch, 410 = expired subscription).",
  });
}
