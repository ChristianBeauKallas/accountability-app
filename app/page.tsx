import { createClient } from "@/lib/supabase/server";
import Onboarding from "./onboarding";
import Composer from "./composer";
import { computeStreak, localDate } from "@/lib/streaks";
import type { Activity } from "@/lib/types";

export const dynamic = "force-dynamic";

type MemberRow = {
  user_id: string;
  role: string;
  profiles: {
    display_name: string;
    avatar_url: string | null;
    timezone: string;
  } | null;
};

type PostRow = {
  id: string;
  author_id: string;
  caption: string | null;
  created_at: string;
  post_activities: { activity_id: string }[];
  author: { display_name: string; avatar_url: string | null } | null;
};

export default async function Home() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return (
      <main>
        <h1>Accountability</h1>
        <div className="notice">
          <strong>Supabase not configured yet.</strong> Set{" "}
          <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then run{" "}
          <code>supabase/schema.sql</code>.
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, role, groups(name, invite_code)")
    .eq("user_id", user.id);

  const membership = memberships?.[0] as
    | { group_id: string; role: string; groups: { name: string; invite_code: string } }
    | undefined;

  if (!membership) {
    return (
      <main>
        <h1>Welcome 👋</h1>
        <p className="subtitle">
          Start a group for your crew, or join one with an invite code.
        </p>
        <Onboarding />
        <SignOut />
      </main>
    );
  }

  const groupId = membership.group_id;

  // Fetch members, activities, and recent posts in parallel.
  const [membersRes, activitiesRes, postsRes] = await Promise.all([
    supabase
      .from("group_members")
      .select("user_id, role, profiles(display_name, avatar_url, timezone)")
      .eq("group_id", groupId),
    supabase
      .from("activities")
      .select("*")
      .eq("group_id", groupId)
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("group_posts")
      .select(
        "id, author_id, caption, created_at, post_activities(activity_id), author:profiles(display_name, avatar_url)",
      )
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const members = (membersRes.data ?? []) as unknown as MemberRow[];
  const activities = (activitiesRes.data ?? []) as Activity[];
  const posts = (postsRes.data ?? []) as unknown as PostRow[];

  const activityById = new Map(activities.map((a) => [a.id, a]));

  // Bucket each member's post dates in their own timezone.
  const tzByUser = new Map(
    members.map((m) => [m.user_id, m.profiles?.timezone ?? "America/New_York"]),
  );
  const datesByUser = new Map<string, Set<string>>();
  for (const p of posts) {
    const tz = tzByUser.get(p.author_id) ?? "America/New_York";
    const set = datesByUser.get(p.author_id) ?? new Set<string>();
    set.add(localDate(p.created_at, tz));
    datesByUser.set(p.author_id, set);
  }

  // Compute streak + today status per member, sorted by streak desc.
  const roster = members
    .map((m) => {
      const tz = m.profiles?.timezone ?? "America/New_York";
      const info = computeStreak(datesByUser.get(m.user_id) ?? new Set(), tz);
      return {
        id: m.user_id,
        name: m.profiles?.display_name ?? "Member",
        avatar: m.profiles?.avatar_url ?? null,
        ...info,
      };
    })
    .sort((a, b) => b.streak - a.streak || a.name.localeCompare(b.name));

  const me = roster.find((r) => r.id === user.id);
  const dark = roster.filter((r) => !r.postedToday);

  return (
    <main className="board">
      <header className="board-head">
        <div>
          <h1>{membership.groups.name}</h1>
          <p className="subtitle">
            {me && me.streak > 0 && (
              <span className="head-streak">{me.streak}🔥</span>
            )}
            <span>
              {roster.filter((r) => r.postedToday).length} of {roster.length}{" "}
              checked in today
            </span>
          </p>
        </div>
        <SignOut compact />
      </header>

      {/* Today strip — who's shown up */}
      <section className="today-strip">
        {roster.map((r) => (
          <div key={r.id} className={`today-avatar ${r.postedToday ? "in" : "out"}`}>
            <Avatar name={r.name} url={r.avatar} />
            <span className="today-name">{r.name.split(" ")[0]}</span>
            {r.postedToday && <span className="check">✓</span>}
          </div>
        ))}
      </section>

      {/* Compose */}
      <Composer
        activities={activities}
        groupId={groupId}
        userId={user.id}
        postedToday={me?.postedToday ?? false}
      />

      {/* Streak leaderboard */}
      <section className="panel">
        <h2>Streaks</h2>
        <ul className="roster">
          {roster.map((r) => (
            <li key={r.id} className="roster-row">
              <Avatar name={r.name} url={r.avatar} />
              <span className="roster-name">{r.name}</span>
              <span className="streak">{r.streak}🔥</span>
              <StatusBadge
                postedToday={r.postedToday}
                daysSince={r.daysSince}
              />
            </li>
          ))}
        </ul>
      </section>

      {/* Who's dark today */}
      {dark.length > 0 && (
        <section className="panel">
          <h2>Missing today</h2>
          <ul className="roster">
            {dark.map((r) => (
              <li key={r.id} className="roster-row dim">
                <Avatar name={r.name} url={r.avatar} />
                <span className="roster-name">{r.name}</span>
                <StatusBadge
                  postedToday={false}
                  daysSince={r.daysSince}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Feed */}
      <section className="panel">
        <h2>Today &amp; recent</h2>
        {posts.length === 0 && (
          <p className="empty">No updates yet. Be the first to log today.</p>
        )}
        {posts.map((p) => (
          <article className="post" key={p.id}>
            <div className="post-head">
              <Avatar name={p.author?.display_name ?? "?"} url={p.author?.avatar_url ?? null} />
              <span className="post-author">{p.author?.display_name}</span>
              <span className="post-time">{timeAgo(p.created_at)}</span>
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
          </article>
        ))}
      </section>
    </main>
  );
}

function StatusBadge({
  postedToday,
  daysSince,
}: {
  postedToday: boolean;
  daysSince: number | null;
}) {
  if (postedToday) return <span className="badge in">today ✓</span>;
  if (daysSince === null) return <span className="badge none">no posts yet</span>;
  return <span className="badge out">{daysSince}d out</span>;
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="avatar" src={url} alt={name} />;
  }
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return <span className="avatar avatar-fallback">{initial}</span>;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  return `${days}d`;
}

function SignOut({ compact = false }: { compact?: boolean }) {
  return (
    <form action="/auth/signout" method="post" className={compact ? "signout-compact" : "signout"}>
      <button type="submit">{compact ? "Sign out" : "Sign out"}</button>
    </form>
  );
}
