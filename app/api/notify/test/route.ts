import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { vapidSubject } from "@/lib/vapid";

export const runtime = "nodejs";

// Diagnostic: sends a push to the CURRENT user's own devices and reports the
// result. Bypasses the "you never notify yourself" rule so you can prove
// delivery end-to-end. Visit /api/notify/test while logged in.
export async function GET(req: Request) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { ok: false, error: "not configured" },
      { status: 503 },
    );
  }
  const subject = vapidSubject(req);
  webpush.setVapidDetails(subject, publicKey, privateKey);

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

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, subscription")
    .eq("user_id", user.id);

  if (!subs || subs.length === 0) {
    return NextResponse.json({
      ok: false,
      devices: 0,
      hint: "This account has no subscribed device. Tap Enable notifications on your installed phone app first.",
    });
  }

  const payload = JSON.stringify({
    title: "Test 🔔",
    body: "If you can see this, notifications work!",
    url: "/",
    tag: "self-test",
  });

  const results = await Promise.all(
    subs.map(async (row) => {
      try {
        await webpush.sendNotification(
          row.subscription as webpush.PushSubscription,
          payload,
        );
        return { ok: true, status: 201 };
      } catch (e) {
        const status = (e as { statusCode?: number })?.statusCode ?? 0;
        const message = (e as { body?: string })?.body || String(e);
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("id", row.id);
        }
        return { ok: false, status, message: message.slice(0, 200) };
      }
    }),
  );

  const sent = results.filter((r) => r.ok).length;
  return NextResponse.json({
    ok: sent > 0,
    subject,
    devices: subs.length,
    sent,
    results,
    hint:
      sent > 0
        ? "Server delivered it. If no banner appeared: lock the phone (iOS hides banners while the app is open), and check iOS Settings → the app → Notifications are allowed."
        : "The push service rejected delivery — see results[].status/message for why (e.g. 403 = VAPID subject/key mismatch, 410 = expired subscription).",
  });
}
