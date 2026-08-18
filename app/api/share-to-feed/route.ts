import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Explicitly share ONE private coaching entry (a weigh-in or progress selfie)
// to the group feed as a normal post. Only the client can share their own.
export async function POST(req: Request) {
  const user = await verifyBearer(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { entryId?: string } | null;
  const entryId = body?.entryId;
  if (!entryId) return NextResponse.json({ error: "no entry" }, { status: 400 });

  const admin = createAdminClient();

  const { data: entry } = await admin
    .from("coaching_entries")
    .select("id, tracker_id, client_id, amount, detail")
    .eq("id", entryId)
    .maybeSingle();
  if (!entry || entry.client_id !== user.id)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: tracker } = await admin
    .from("coaching_trackers")
    .select("label, emoji, unit")
    .eq("id", entry.tracker_id)
    .maybeSingle();

  const { data: gm } = await admin
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!gm) return NextResponse.json({ error: "no group" }, { status: 400 });

  const label = (tracker?.label as string) ?? "Update";
  const emoji = (tracker?.emoji as string) ?? "✅";
  let caption: string;
  if (/weight|scale|weigh/i.test(label) && entry.amount != null) {
    caption = `⚖️ Weigh-in: ${entry.amount}${tracker?.unit ?? " lb"}`;
  } else if (/selfie|progress|photo/i.test(label)) {
    caption = "📸 Progress check";
  } else {
    caption = `${emoji} ${label}`;
  }
  if (entry.detail) caption += ` — ${entry.detail}`;

  const { data: post, error } = await admin
    .from("group_posts")
    .insert({
      group_id: gm.group_id,
      author_id: user.id,
      caption,
      source: "manual",
    })
    .select("id")
    .single();
  if (error || !post)
    return NextResponse.json({ error: error?.message ?? "save failed" }, { status: 500 });

  // Bring the entry's photos onto the post (parallel media rows → group-readable).
  const { data: photos } = await admin
    .from("media")
    .select("storage_path")
    .eq("entry_id", entryId)
    .eq("type", "image");
  if (photos && photos.length > 0) {
    await admin.from("media").insert(
      photos.map((m) => ({
        owner_id: user.id,
        type: "image",
        storage_path: m.storage_path as string,
        post_id: post.id as string,
      })),
    );
  }

  return NextResponse.json({ ok: true, postId: post.id });
}
