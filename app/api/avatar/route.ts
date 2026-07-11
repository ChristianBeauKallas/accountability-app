import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { verifyBearer } from "@/lib/auth-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
};

// Uploads a profile picture using the service role (bypasses storage RLS) and
// sets the user's avatar_url. Creates the avatars bucket if it doesn't exist.
export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Avatar uploads not configured — add SUPABASE_SERVICE_ROLE_KEY in Vercel and redeploy." },
      { status: 503 },
    );
  }

  const user = await verifyBearer(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }

  const admin = createAdminClient();
  // Make sure the bucket exists (public). Ignore "already exists".
  await admin.storage.createBucket("avatars", { public: true }).catch(() => {});

  const ext = EXT[file.type] ?? "jpg";
  const path = `${user.id}/${randomUUID()}.${ext}`;

  const { error: upErr } = await admin.storage
    .from("avatars")
    .upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { data: pub } = admin.storage.from("avatars").getPublicUrl(path);
  const { error: updErr } = await admin
    .from("profiles")
    .update({ avatar_url: pub.publicUrl })
    .eq("id", user.id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ url: pub.publicUrl });
}
