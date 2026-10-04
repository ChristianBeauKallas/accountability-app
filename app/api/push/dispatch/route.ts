import { NextRequest, NextResponse } from "next/server";
import { dispatchNotification } from "@/lib/push/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Called by a Supabase Database Webhook on INSERT into public.notifications.
 * Configure the webhook to send header  x-webhook-secret: <PUSH_WEBHOOK_SECRET>.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    type?: string;
    table?: string;
    record?: {
      user_id: string;
      type: string;
      title: string;
      body: string | null;
      data: Record<string, unknown> | null;
    };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  if (body.type !== "INSERT" || body.table !== "notifications" || !body.record) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const result = await dispatchNotification(body.record);
    return NextResponse.json({ ok: true, ...result });
  } catch {
    // Never fail the webhook hard — a push error shouldn't retry forever.
    return NextResponse.json({ ok: true, sent: 0 });
  }
}
