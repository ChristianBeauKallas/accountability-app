import { NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDate } from "@/lib/streaks";
import { vapidSubject } from "@/lib/vapid";

export const runtime = "nodejs";

// Daily reminder: nudges members who haven't finished all of today's activities.
// Triggered by a Vercel Cron (see vercel.json). Personal only — each person is
// reminded about their own day, never called out to the group.
export async function GET(req: Request) {
  // Optional shared secret. Vercel attaches this header automatically when the
  // CRON_SECRET env var is set; if it's unset the endpoint is open.
  if (process.env.CRON_SECRET) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${process.env.CRON_SECRET}`)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, error: "not configured" }, { status: 503 });
  }
  webpush.setVapidDetails(vapidSubject(req), publicKey, privateKey);

  const admin = createAdminClient();
  const now = new Date();

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
