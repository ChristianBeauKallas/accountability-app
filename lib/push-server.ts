import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export function pushConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Send one push to every device of a set of users. `subject` is the VAPID
// subject (use vapidSubject(req)). Dead subscriptions (404/410) are pruned.
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
  subject: string,
): Promise<number> {
  if (!pushConfigured() || userIds.length === 0) return 0;
  webpush.setVapidDetails(
    subject,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, subscription")
    .in("user_id", userIds);

  const json = JSON.stringify({
    title: payload.title,
    body: payload.body.slice(0, 140),
    url: payload.url ?? "/",
    tag: payload.tag ?? "gb",
  });

  let sent = 0;
  await Promise.all(
    (subs ?? []).map(async (row) => {
      try {
        await webpush.sendNotification(
          row.subscription as webpush.PushSubscription,
          json,
        );
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410)
          await admin.from("push_subscriptions").delete().eq("id", row.id);
      }
    }),
  );
  return sent;
}
