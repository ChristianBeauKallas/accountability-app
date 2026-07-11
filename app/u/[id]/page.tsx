import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeStreak, bestStreak, localDate } from "@/lib/streaks";
import type { Activity } from "@/lib/types";
import ProfileEditor from "./profile-editor";
import NotificationsToggle from "./notifications-toggle";
import PostCard from "@/app/post-card";

export const dynamic = "force-dynamic";

type PostRow = {
  id: string;
  caption: string | null;
  created_at: string;
  post_activities: { activity_id: string }[];
  media: { id: string; type: string; storage_path: string }[];
};

function timeBucket(iso: string, tz: string): string {
  const h =
    Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "2-digit",
        hour12: false,
      }).format(new Date(iso)),
    ) % 24;
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return "night";
}

const BUCKET_EMOJI: Record<string, string> = {
  morning: "🌅",
  afternoon: "☀️",
  evening: "🌆",
  night: "🌙",
};

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const isMe = user.id === id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, timezone, created_at")
    .eq("id", id)
    .single();
  if (!profile) notFound();

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);
  const groupId = memberships?.[0]?.group_id as string | undefined;

  const [membersRes, activitiesRes, postsRes] = await Promise.all([
    groupId
      ? supabase
          .from("group_members")
          .select("user_id, profiles(display_name)")
          .eq("group_id", groupId)
      : Promise.resolve({ data: [] }),
    groupId
      ? supabase
          .from("activities")
          .select("*")
          .eq("group_id", groupId)
          .eq("active", true)
          .order("sort_order")
      : Promise.resolve({ data: [] }),
    groupId
      ? supabase
          .from("group_posts")
          .select(
            "id, caption, created_at, post_activities(activity_id), media(id, type, storage_path)",
          )
          .eq("group_id", groupId)
          .eq("author_id", id)
          .order("created_at", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] }),
  ]);

  const members = (membersRes.data ?? []) as unknown as {
    user_id: string;
    profiles: { display_name: string } | null;
  }[];
  const nameById = new Map(
    members.map((m) => [m.user_id, m.profiles?.display_name ?? "Member"]),
  );
  const activities = (activitiesRes.data ?? []) as Activity[];
  const posts = (postsRes.data ?? []) as unknown as PostRow[];
  const activityById = new Map(activities.map((a) => [a.id, a]));
  const tz = profile.timezone ?? "America/New_York";

  // ---- Stats ----
  const dates = new Set(posts.map((p) => localDate(p.created_at, tz)));
  const { streak } = computeStreak(dates, tz);
  const best = bestStreak(dates);
  const totalDays = dates.size;

  const counts = new Map<string, number>();
  for (const p of posts)
    for (const { activity_id } of p.post_activities)
      counts.set(activity_id, (counts.get(activity_id) ?? 0) + 1);
  const topActivity = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([aid]) => activityById.get(aid))
    .filter(Boolean)[0] as Activity | undefined;

  const buckets = new Map<string, number>();
  for (const p of posts) {
    const b = timeBucket(p.created_at, tz);
    buckets.set(b, (buckets.get(b) ?? 0) + 1);
  }
  const topBucket = [...buckets.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  const last30 = new Set(
    [...dates].filter(
      (d) => (Date.now() - new Date(d + "T12:00:00Z").getTime()) / 86400000 <= 30,
    ),
  ).size;

  // ---- Media / transcripts / reactions / comments (mirror the feed) ----
  const allPaths = posts.flatMap((p) => p.media.map((m) => m.storage_path));
  const signedByPath = new Map<string, string>();
  if (allPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("media")
      .createSignedUrls(allPaths, 60 * 60);
    for (const s of signed ?? [])
      if (s.signedUrl && s.path) signedByPath.set(s.path, s.signedUrl);
  }

  const transcriptById = new Map<string, string>();
  const audioIds = posts.flatMap((p) =>
    p.media.filter((m) => m.type === "audio").map((m) => m.id),
  );
  if (audioIds.length > 0) {
    const { data: trows } = await supabase
      .from("media")
      .select("id, transcript")
      .in("id", audioIds);
    for (const r of (trows ?? []) as { id: string; transcript: string | null }[])
      if (r.transcript) transcriptById.set(r.id, r.transcript);
  }

  const reactionsByPost = new Map<
    string,
    Record<string, { count: number; mine: boolean }>
  >();
  if (posts.length > 0) {
    const { data: reactions } = await supabase
      .from("post_reactions")
      .select("post_id, user_id, type")
      .in(
        "post_id",
        posts.map((p) => p.id),
      );
    for (const r of (reactions ?? []) as {
      post_id: string;
      user_id: string;
      type: string | null;
    }[]) {
      const rec = reactionsByPost.get(r.post_id) ?? {};
      const t = r.type ?? "fire";
      const cur = rec[t] ?? { count: 0, mine: false };
      cur.count += 1;
      if (r.user_id === user.id) cur.mine = true;
      rec[t] = cur;
      reactionsByPost.set(r.post_id, rec);
    }
  }

  const commentsByPost = new Map<
    string,
    { id: string; body: string; authorName: string }[]
  >();
  if (posts.length > 0) {
    const { data: cdata } = await supabase
      .from("comments")
      .select("id, post_id, author_id, body, created_at")
      .in(
        "post_id",
        posts.map((p) => p.id),
      )
      .order("created_at", { ascending: true });
    for (const c of (cdata ?? []) as {
      id: string;
      post_id: string;
      author_id: string;
      body: string;
    }[]) {
      const arr = commentsByPost.get(c.post_id) ?? [];
      arr.push({
        id: c.id,
        body: c.body,
        authorName: nameById.get(c.author_id) ?? "Someone",
      });
      commentsByPost.set(c.post_id, arr);
    }
  }

  return (
    <main className="board profile">
      <header className="board-head">
        <div>
          <h1>Profile</h1>
          <p className="subtitle">
            <Link href="/">‹ Feed</Link>
          </p>
        </div>
        {isMe && (
          <form action="/auth/signout" method="post" className="signout-compact">
            <button type="submit">Sign out</button>
          </form>
        )}
      </header>

      {/* Identity: avatar + name */}
      <section className="profile-id">
        {isMe ? (
          <ProfileEditor
            userId={profile.id}
            displayName={profile.display_name}
            avatarUrl={profile.avatar_url}
          />
        ) : (
          <div className="profile-editor">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="avatar-lg" src={profile.avatar_url} alt="" />
            ) : (
              <span className="avatar-lg avatar-fallback">
                {profile.display_name.charAt(0).toUpperCase()}
              </span>
            )}
            <h2 className="profile-name">{profile.display_name}</h2>
          </div>
        )}
      </section>

      {/* Stats: streak + most logged */}
      <section className="profile-stats">
        <div className="stat-tile">
          <span className="stat-num">
            {streak}
            <span className="flame">🔥</span>
          </span>
          <span className="stat-label">day streak</span>
        </div>
        {topActivity && (
          <div className="stat-tile wide">
            <span className="stat-cap">Most logged</span>
            <span className="stat-value">
              {topActivity.emoji ?? "✅"} {topActivity.name}
            </span>
          </div>
        )}
      </section>

      {isMe && <NotificationsToggle userId={profile.id} />}

      {/* Pills */}
      {posts.length > 0 && (
        <div className="stat-pills">
          {topBucket && (
            <span className="chip">
              {BUCKET_EMOJI[topBucket]} {topBucket} check-ins
            </span>
          )}
          <span className="chip">🔥 Best: {best}</span>
          <span className="chip">📅 {last30}/30 last month</span>
          <span className="chip">✅ {totalDays} total days</span>
        </div>
      )}

      {/* Updates — identical to the feed */}
      <section className="panel">
        <h2>{isMe ? "Your updates" : "Updates"}</h2>
        {posts.length === 0 && <p className="empty">No updates yet.</p>}
        {posts.map((p) => {
          const photos = p.media
            .filter((m) => m.type === "image")
            .map((m) => signedByPath.get(m.storage_path))
            .filter((s): s is string => !!s);
          const audios = p.media
            .filter((m) => m.type === "audio")
            .map((m) => ({
              id: m.id,
              src: signedByPath.get(m.storage_path),
              transcript: transcriptById.get(m.id) ?? null,
            }))
            .filter(
              (a): a is { id: string; src: string; transcript: string | null } =>
                !!a.src,
            );
          const activityItems = p.post_activities
            .map(({ activity_id }) => {
              const a = activityById.get(activity_id);
              return a ? { emoji: a.emoji ?? "✅", name: a.name } : null;
            })
            .filter((x): x is { emoji: string; name: string } => !!x);

          return (
            <PostCard
              key={p.id}
              postId={p.id}
              authorId={id}
              authorName={profile.display_name}
              authorAvatar={profile.avatar_url}
              createdAt={p.created_at}
              photos={photos}
              audios={audios}
              caption={p.caption}
              activityItems={activityItems}
              activityTotal={activities.length}
              reactions={reactionsByPost.get(p.id) ?? {}}
              comments={commentsByPost.get(p.id) ?? []}
              viewerId={user.id}
            />
          );
        })}
      </section>
    </main>
  );
}
