import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeStreak, bestStreak, localDate } from "@/lib/streaks";
import type { Activity } from "@/lib/types";
import ProfileEditor from "./profile-editor";
import NotificationsToggle from "./notifications-toggle";

export const dynamic = "force-dynamic";

type PostRow = {
  id: string;
  caption: string | null;
  created_at: string;
  post_activities: { activity_id: string }[];
  media: { id: string; type: string; storage_path: string }[];
};

function timeBucket(iso: string, tz: string): string {
  const h = Number(
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

  // Target profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, timezone, created_at")
    .eq("id", id)
    .single();
  if (!profile) notFound();

  // Viewer's group provides the context for which posts we can see.
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);
  const groupId = memberships?.[0]?.group_id as string | undefined;

  const [activitiesRes, postsRes] = await Promise.all([
    groupId
      ? supabase.from("activities").select("*").eq("group_id", groupId)
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

  const activities = (activitiesRes.data ?? []) as Activity[];
  const posts = (postsRes.data ?? []) as unknown as PostRow[];
  const activityById = new Map(activities.map((a) => [a.id, a]));
  const tz = profile.timezone ?? "America/New_York";

  // ---- Stats / tendencies ----
  const dates = new Set(posts.map((p) => localDate(p.created_at, tz)));
  const { streak } = computeStreak(dates, tz);
  const best = bestStreak(dates);
  const totalDays = dates.size;

  // Most common activities
  const counts = new Map<string, number>();
  for (const p of posts)
    for (const { activity_id } of p.post_activities)
      counts.set(activity_id, (counts.get(activity_id) ?? 0) + 1);
  const topActivities = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([aid]) => activityById.get(aid))
    .filter(Boolean)
    .slice(0, 2) as Activity[];

  // Time-of-day tendency
  const buckets = new Map<string, number>();
  for (const p of posts) {
    const b = timeBucket(p.created_at, tz);
    buckets.set(b, (buckets.get(b) ?? 0) + 1);
  }
  const topBucket = [...buckets.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  // Consistency over the last 30 days
  const last30 = new Set(
    [...dates].filter((d) => {
      const diff =
        (Date.now() - new Date(d + "T12:00:00Z").getTime()) / 86400000;
      return diff <= 30;
    }),
  ).size;

  // Signed URLs for their post media
  const allPaths = posts.flatMap((p) => p.media.map((m) => m.storage_path));
  const signedByPath = new Map<string, string>();
  if (allPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("media")
      .createSignedUrls(allPaths, 60 * 60);
    for (const s of signed ?? [])
      if (s.signedUrl && s.path) signedByPath.set(s.path, s.signedUrl);
  }

  return (
    <main className="board profile">
      <header className="board-head">
        <div>
          <h1>Profile</h1>
          <p className="subtitle">
            <Link href="/">‹ Board</Link>
          </p>
        </div>
      </header>

      <section className="profile-hero">
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

        <div className="profile-streak">
          <span className="profile-streak-num">{streak}</span>
          <span className="flame">🔥</span>
          <span className="profile-streak-label">day streak</span>
        </div>
      </section>

      {isMe && <NotificationsToggle userId={profile.id} />}

      {/* Tendencies */}
      {posts.length > 0 && (
        <section className="tendencies">
          {topActivities[0] && (
            <div className="tendency hero-tendency">
              <span className="tendency-label">Most common</span>
              <span className="tendency-value">
                {topActivities[0].emoji ?? "✅"} {topActivities[0].name}
              </span>
            </div>
          )}
          <div className="tendency-chips">
            {topBucket && (
              <span className="chip">
                {BUCKET_EMOJI[topBucket]} {topBucket} check-ins
              </span>
            )}
            <span className="chip">🔥 Best: {best}</span>
            <span className="chip">📅 {last30}/30 last month</span>
            <span className="chip">✅ {totalDays} total days</span>
            {topActivities[1] && (
              <span className="chip">
                {topActivities[1].emoji ?? "✅"} {topActivities[1].name}
              </span>
            )}
          </div>
        </section>
      )}

      {/* Their posts */}
      <section className="panel">
        <h2>{isMe ? "Your updates" : "Updates"}</h2>
        {posts.length === 0 && <p className="empty">No updates yet.</p>}
        {posts.map((p) => (
          <article className="post" key={p.id}>
            <div className="post-head">
              <span className="post-time">{fmtDate(p.created_at)}</span>
            </div>
            {p.post_activities.length > 0 && (
              <div className="chips">
                {p.post_activities.map(({ activity_id }) => {
                  const a = activityById.get(activity_id);
                  if (!a) return null;
                  return (
                    <span className="chip" key={activity_id}>
                      {a.emoji ?? "✅"} {a.name}
                    </span>
                  );
                })}
              </div>
            )}
            {p.caption && <p className="post-caption">{p.caption}</p>}
            {p.media.map((m) => {
              const src = signedByPath.get(m.storage_path);
              if (!src) return null;
              if (m.type === "image")
                // eslint-disable-next-line @next/next/no-img-element
                return <img className="post-photo" key={m.id} src={src} alt="" />;
              if (m.type === "audio")
                return <audio className="post-audio" key={m.id} controls src={src} />;
              return null;
            })}
          </article>
        ))}
      </section>

      {isMe && (
        <form action="/auth/signout" method="post" className="signout">
          <button type="submit">Sign out</button>
        </form>
      )}
    </main>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
