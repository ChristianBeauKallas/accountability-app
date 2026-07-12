import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Permanently deletes the requesting user and everything tied to them.
// Requires the service role: only the server can remove an auth user, and
// groups they OWN are `on delete restrict`, so those must go first. Deleting
// the profile then cascades all their member-level rows (posts, comments,
// reactions, messages, memberships, push subs, media) via FK on delete cascade.
export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      {
        error:
          "Account deletion not configured — add SUPABASE_SERVICE_ROLE_KEY in Vercel and redeploy.",
      },
      { status: 503 },
    );
  }

  const user = await verifyBearer(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // 1) Delete groups this user owns (cascades members, activities, posts,
  //    comments, reactions, messages, and post media within them).
  const { error: groupErr } = await admin
    .from("groups")
    .delete()
    .eq("owner_id", user.id);
  if (groupErr) {
    return NextResponse.json({ error: groupErr.message }, { status: 500 });
  }

  // 2) Best-effort: remove their uploaded files (their id is the folder).
  for (const bucket of ["avatars", "media"]) {
    try {
      const { data: files } = await admin.storage.from(bucket).list(user.id);
      if (files && files.length > 0) {
        await admin.storage
          .from(bucket)
          .remove(files.map((f) => `${user.id}/${f.name}`));
      }
    } catch {
      /* storage cleanup is non-critical */
    }
  }

  // 3) Delete the auth user — cascades their profile and all remaining rows.
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
