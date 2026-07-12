import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  computeStreak,
  bestStreak,
  localDate,
  fullCompletionDays,
} from "@/lib/streaks";
import type { Activity } from "@/lib/types";
import ProfileEditor from "./profile-editor";
import PostCard from "@/app/post-card";

export const dynamic = "force-dynamic";

type PostRow = {
  id: string;
  caption: string | null;
  created_at: string;
  post_activities: { activity_id: string }[];
  media: { id: string; type: string; storage_path: string }[];
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

  // Bio fetched separately so a missing column can never break the page.
  let bio: string | null = null;
  {
    const { data: bioRow } = await supabase
      .from("profiles")
      .select("bio")
      .eq("id", id)
      .maybeSingle();
    bio = (bioRow as { bio?: string | null } | null)?.bio ?? null;
  }

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
  // A day only counts toward streaks/tallies when the member logged every
  // activity that existed as of that day. Aggregate their logged activities per
  // local day, then keep the days that met that day's bar.
  const actsByDay = new Map<string, Set<string>>();
  for (const p of posts) {
    const day = localDate(p.created_at, tz);
    let set = actsByDay.get(day);
    if (!set) {
      set = new Set<string>();
      actsByDay.set(day, set);
    }
    for (const pa of p.post_activities ?? [])
      if (activityById.has(pa.activity_id)) set.add(pa.activity_id);
  }
  const startDays = activities.map((a) => localDate(a.created_at, tz));
  const dates = fullCompletionDays(actsByDay, startDays);
  const { streak } = computeStreak(dates, tz);
  const best = bestStreak(dates);
  const totalDays = dates.size;

  // Days logged this calendar month, out of days elapsed so far this month.
  const nowLocal = localDate(new Date(), tz);
  const monthPrefix = nowLocal.slice(0, 7);
  const thisMonth = [...dates].filter((d) => d.slice(0, 7) === monthPrefix).length;
  const dayOfMonth = Number(nowLocal.slice(8, 10));

  // How many days they've had the account (for the "logged / days" ratio).
  const accountDays = Math.max(
    1,
    Math.floor(
      (Date.now() - new Date(profile.created_at).getTime()) / 86400000,
    ) + 1,
  );
  // Don't penalize days before they joined: "possible" days this month are
  // capped at how long they've had the account.
  const possibleThisMonth = Math.min(dayOfMonth, accountDays);

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

  const durationById = new Map<string, number>();
  if (audioIds.length > 0) {
    const { data: drows } = await supabase
      .from("media")
      .select("id, duration_seconds")
      .in("id", audioIds);
    for (const r of (drows ?? []) as {
      id: string;
      duration_seconds: number | null;
    }[])
      if (r.duration_seconds) durationById.set(r.id, r.duration_seconds);
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
        <div className="board-head-top">
          <div>
            <h1>Profile</h1>
            <p className="subtitle">
              <Link href="/">‹ Feed</Link>
            </p>
          </div>
          {isMe && (
            <form
              action="/auth/signout"
              method="post"
              className="signout-compact"
            >
              <button type="submit">Sign out</button>
            </form>
          )}
        </div>
      </header>

      {/* Identity: avatar + name */}
      <section className="profile-id">
        {isMe ? (
          <ProfileEditor
            userId={profile.id}
            displayName={profile.display_name}
            avatarUrl={profile.avatar_url}
            bio={bio}
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
            <div className="profile-id-text">
              <h2 className="profile-name">{profile.display_name}</h2>
              {bio && <p className="profile-bio">{bio}</p>}
            </div>
          </div>
        )}
      </section>

      {/* Stats — four tiles */}
      <section className="profile-stats stats-4">
        <div className="stat-tile mini">
          <span className="mini-num">{streak}</span>
          <span className="mini-label">🔥 Streak</span>
        </div>
        <div className="stat-tile mini">
          <span className="mini-num">{best}</span>
          <span className="mini-label">🏆 Best</span>
        </div>
        <div className="stat-tile mini">
          <span className="mini-num">
            {thisMonth}/{possibleThisMonth}
          </span>
          <span className="mini-label">📅 This mo.</span>
        </div>
        <div className="stat-tile mini">
          <span className="mini-num">
            {totalDays}/{accountDays}
          </span>
          <span className="mini-label">✅ All time</span>
        </div>
      </section>

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
              duration: durationById.get(m.id) ?? null,
            }))
            .filter(
              (
                a,
              ): a is {
                id: string;
                src: string;
                transcript: string | null;
                duration: number | null;
              } => !!a.src,
            );
          // Whole-day progress, not just this single post (matches the ring).
          const dayActIds =
            actsByDay.get(localDate(p.created_at, tz)) ?? new Set<string>();
          const activityItems = activities
            .filter((a) => dayActIds.has(a.id))
            .map((a) => ({ emoji: a.emoji ?? "✅", name: a.name }));

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
