"use client";

import { createClient } from "@/lib/supabase/client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export type EnableResult = "granted" | "denied" | "unsupported" | "error";

/** True if this device currently has an active push subscription. */
export async function pushSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false;
  if (Notification.permission !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    return !!(await reg.pushManager.getSubscription());
  } catch {
    return false;
  }
}

/** Whether an existing subscription was made with the given server key. */
function keyMatches(existing: ArrayBuffer | null | undefined, want: Uint8Array) {
  if (!existing) return false;
  const have = new Uint8Array(existing);
  if (have.length !== want.length) return false;
  for (let i = 0; i < have.length; i++) if (have[i] !== want[i]) return false;
  return true;
}

/** Asks permission, subscribes this device, and stores the subscription. */
export async function enablePush(userId: string): Promise<EnableResult> {
  if (!pushSupported()) return "unsupported";
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return "error";

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";

    const wantKey = urlBase64ToUint8Array(key);
    const reg = await navigator.serviceWorker.ready;

    // Re-use the current subscription only if it was made with THIS server key.
    // After a VAPID key rotation the old one is stale — drop it and re-subscribe,
    // otherwise the push service rejects delivery (Apple 403 BadJwtToken).
    let sub = await reg.pushManager.getSubscription();
    if (sub && !keyMatches(sub.options.applicationServerKey, wantKey)) {
      try {
        await sub.unsubscribe();
      } catch {
        /* ignore */
      }
      sub = null;
    }
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: wantKey as BufferSource,
      });
    }

    const supabase = createClient();
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        subscription: sub.toJSON() as unknown as Record<string, unknown>,
      },
      { onConflict: "endpoint" },
    );
    if (error) return "error";
    return "granted";
  } catch {
    return "error";
  }
}

/** Unsubscribes this device and removes the stored subscription. */
export async function disablePush(userId: string): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const supabase = createClient();
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  } catch {
    /* best-effort */
  }
}

/** Fire-and-forget: tell the server to notify others about an event. */
export async function notify(
  type: "post" | "comment" | "message",
  id: string,
): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    await fetch("/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ type, id }),
      keepalive: true,
    });
  } catch {
    // Notifications are best-effort; never block the user action.
  }
}
