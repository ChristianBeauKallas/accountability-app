import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Body = { type?: "post" | "comment" | "message"; id?: string };

export async function POST(req: Request) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Notifications not configured yet — no-op so posting still works.
    return NextResponse.json({ ok: true, configured: false });
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:notifications@accountability.app",
    publicKey,
    privateKey,
  );

  // Authenticate the caller.
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return NextResponse.json({ error: "no token" }, { status: 401 });

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const {
    data: { user },
  } = await anon.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "invalid token" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.type || !body?.id)
    return NextResponse.json({ error: "bad request" }, { status: 400 });

  const admin = createAdminClient();

  async function nameOf(uid: string): Promise<string> {
    const { data } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", uid)
      .single();
    return data?.display_name ?? "Someone";
  }
  async function groupRecipients(
    groupId: string,
    exclude: string,
  ): Promise<string[]> {
    const { data } = await admin
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId);
    return (data ?? []).map((m) => m.user_id).filter((u) => u !== exclude);
  }

  let recipientIds: string[] = [];
  let actorId = "";
  let title = "Accountability";
  let text = "";
  let url = "/";
  let tag = "";

  if (body.type === "post") {
    const { data: post } = await admin
      .from("group_posts")
      .select("id, group_id, author_id, caption")
      .eq("id", body.id)
      .single();
    if (!post) return NextResponse.json({ ok: true });
    actorId = post.author_id;
    recipientIds = await groupRecipients(post.group_id, actorId);
    title = `${await nameOf(actorId)} checked in`;
    text = post.caption || "Posted today's update";
    url = "/";
    tag = `post-${post.id}`;
  } else if (body.type === "comment") {
    const { data: comment } = await admin
      .from("comments")
      .select("id, post_id, author_id, body")
      .eq("id", body.id)
      .single();
    if (!comment) return NextResponse.json({ ok: true });
    actorId = comment.author_id;
    const { data: post } = await admin
      .from("group_posts")
      .select("author_id")
      .eq("id", comment.post_id)
      .single();
    if (post && post.author_id !== actorId) recipientIds = [post.author_id];
    title = `${await nameOf(actorId)} commented`;
    text = comment.body;
    url = "/";
    tag = `comment-${comment.post_id}`;
  } else if (body.type === "message") {
    const { data: msg } = await admin
      .from("messages")
      .select("id, group_id, author_id, body")
      .eq("id", body.id)
      .single();
    if (!msg) return NextResponse.json({ ok: true });
    actorId = msg.author_id;
    recipientIds = await groupRecipients(msg.group_id, actorId);
    title = await nameOf(actorId);
    text = msg.body;
    url = "/chat";
    tag = `chat-${msg.group_id}`;
  } else {
    return NextResponse.json({ error: "unknown type" }, { status: 400 });
  }

  // Only the actor can trigger notifications about their own action.
  if (user.id !== actorId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (recipientIds.length === 0)
    return NextResponse.json({ ok: true, sent: 0 });

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, subscription")
    .in("user_id", recipientIds);

  const payload = JSON.stringify({ title, body: text.slice(0, 140), url, tag });

  let sent = 0;
  await Promise.all(
    (subs ?? []).map(async (row) => {
      try {
        await webpush.sendNotification(
          row.subscription as webpush.PushSubscription,
          payload,
        );
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          // Subscription is dead — clean it up.
          await admin.from("push_subscriptions").delete().eq("id", row.id);
        }
      }
    }),
  );

  return NextResponse.json({ ok: true, sent });
}
