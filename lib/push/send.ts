import "server-only";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:hello@athletx.app";

let configured = false;
function configure() {
  if (configured) return;
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    configured = true;
  }
}

/** Service-role Supabase client — reads subscriptions without a user session. */
function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
};

type NotificationRecord = {
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
};

/** Where a notification should deep-link to when tapped. */
export function urlForNotification(n: NotificationRecord): string {
  const data = n.data ?? {};
  switch (n.type) {
    case "new_applicant":
      return "/inbox";
    case "coach_interested":
      return "/tracker";
    case "program_update":
      return data.program_id ? `/programs/${data.program_id}` : "/notifications";
    default:
      return "/notifications";
  }
}

/** Send a web push to every browser a user has enabled, pruning dead ones. */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; pruned: number }> {
  configure();
  if (!configured) return { sent: 0, pruned: 0 };

  const supabase = admin();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return { sent: 0, pruned: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  const dead: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          body
        );
        sent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) dead.push(s.endpoint);
      }
    })
  );

  let pruned = 0;
  if (dead.length) {
    const { count } = await supabase
      .from("push_subscriptions")
      .delete({ count: "exact" })
      .in("endpoint", dead);
    pruned = count ?? dead.length;
  }

  return { sent, pruned };
}

/** Build + send a push from a raw notifications row. */
export async function dispatchNotification(n: NotificationRecord) {
  return sendPushToUser(n.user_id, {
    title: n.title,
    body: n.body ?? undefined,
    url: urlForNotification(n),
    tag: n.type,
  });
}
