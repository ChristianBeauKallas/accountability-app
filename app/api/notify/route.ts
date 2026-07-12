import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { vapidSubject } from "@/lib/vapid";

export const runtime = "nodejs";

// Whether NEXT_PUBLIC_VAPID_PUBLIC_KEY is the pair of VAPID_PRIVATE_KEY. A
// mismatch is the classic cause of Apple's 403 BadJwtToken.
function vapidKeysMatch(): boolean | null {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return null;
  try {
    const privBuf = Buffer.from(
      priv.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    );
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.setPrivateKey(privBuf);
    const derived = ecdh
      .getPublicKey()
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    return derived === pub.replace(/=+$/, "");
  } catch {
    return false;
  }
}

type Body = { type?: "post" | "comment" | "message"; id?: string };

// Diagnostic: GET /api/notify tells you what's configured and (if you pass your
// bearer token) how many devices you've subscribed. Values are never exposed —
// only whether each secret is present. Visit /api/notify in the app to see it.
export async function GET(req: Request) {
  const env = {
    vapidPublicKey: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    vapidPrivateKey: !!process.env.VAPID_PRIVATE_KEY,
    vapidSubject: !!process.env.VAPID_SUBJECT,
    serviceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  const configured =
    env.vapidPublicKey && env.vapidPrivateKey && env.serviceRoleKey;
  const keysMatch = vapidKeysMatch();

  let yourDevices: number | null = null;
  let totalDevices: number | null = null;
  if (env.serviceRoleKey) {
    try {
      // Prefer the logged-in session (cookies) so just visiting the URL works;
      // fall back to a bearer token if one was passed.
      const authHeader = req.headers.get("authorization") || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      let user = null;
      if (token) {
        const anon = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );
        user = (await anon.auth.getUser(token)).data.user;
      } else {
        const server = await createServerClient();
        user = (await server.auth.getUser()).data.user;
      }
      const admin = createAdminClient();
      if (user) {
        const { count } = await admin
          .from("push_subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        yourDevices = count ?? 0;
      }
      const { count: total } = await admin
        .from("push_subscriptions")
        .select("id", { count: "exact", head: true });
      totalDevices = total ?? 0;
    } catch {
      /* leave counts null */
    }
  }

  return NextResponse.json({
    configured,
    keysMatch,
    env,
    yourDevices,
    totalDevices,
    hint:
      keysMatch === false
        ? "VAPID keys do NOT match — the public key doesn't correspond to the private key. Regenerate a matching pair, set both in Vercel, delete old subscriptions, and re-enable. This causes Apple's 403 BadJwtToken."
        : configured
          ? "Config looks good. If you still get nothing: the recipient must have tapped Enable (totalDevices > 0), and on iPhone must have the app on their home screen. You never get notified of your own actions."
          : "Missing env vars in Vercel — add the VAPID keys + SUPABASE_SERVICE_ROLE_KEY and redeploy.",
  });
}

export async function POST(req: Request) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Notifications not configured yet — no-op so posting still works.
    return NextResponse.json({ ok: true, configured: false });
  }
  webpush.setVapidDetails(vapidSubject(req), publicKey, privateKey);

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
    title = `${await nameOf(actorId)} just checked in`;
    text = "Tap to cheer them on 👏";
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
    title = `💬 ${await nameOf(actorId)} replied`;
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
