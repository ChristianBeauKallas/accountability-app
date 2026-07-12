import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Onboarding from "./onboarding";
import Composer from "./composer";
import Tour from "./tour";
import InstallModal from "./install-modal";
import PostCard from "./post-card";
import { Avatar } from "./avatar";
import { ProgressAvatar } from "./progress-avatar";
import HeaderBell from "./header-bell";
import NotifPrompt from "./notif-prompt";
import { computeStreak, localDate, fullCompletionDays } from "@/lib/streaks";
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
  media: { id: string; type: string; storage_path: string }[];
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
    const meta = user.user_metadata as { display_name?: string } | undefined;
    const firstName = meta?.display_name?.trim().split(" ")[0];
    return (
      <main className="auth">
        <Onboarding name={firstName} />
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
        "id, author_id, caption, created_at, post_activities(activity_id), media(id, type, storage_path)",
      )
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const members = (membersRes.data ?? []) as unknown as MemberRow[];
  const activities = (activitiesRes.data ?? []) as Activity[];
  const posts = (postsRes.data ?? []) as unknown as PostRow[];

  const activityById = new Map(activities.map((a) => [a.id, a]));

  // Whether this member has already finished the onboarding tour (tolerant: a
  // missing column just leaves it null, so the tour falls back to localStorage).
  let onboardedAt: string | null = null;
  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", user.id)
      .maybeSingle();
    onboardedAt = (prof as { onboarded_at: string | null } | null)?.onboarded_at ?? null;
  } catch {
    /* column not migrated yet — ignore */
  }

  // Author info comes from the members list (no fragile query embeds).
  const memberInfo = new Map(
    members.map((m) => [
      m.user_id,
      {
        name: m.profiles?.display_name ?? "Member",
        avatar: m.profiles?.avatar_url ?? null,
      },
    ]),
  );

  // Comments fetched separately and grouped by post.
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
    for (const c of cdata ?? []) {
      const arr = commentsByPost.get(c.post_id) ?? [];
      arr.push({
        id: c.id,
        body: c.body,
        authorName: memberInfo.get(c.author_id)?.name ?? "Someone",
      });
      commentsByPost.set(c.post_id, arr);
    }
  }

  // Batch-sign every media path once (bucket is private).
  const allPaths = posts.flatMap((p) => p.media.map((m) => m.storage_path));
  const signedByPath = new Map<string, string>();
  if (allPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("media")
      .createSignedUrls(allPaths, 60 * 60);
    for (const s of signed ?? []) {
      if (s.signedUrl && s.path) signedByPath.set(s.path, s.signedUrl);
    }
  }

  // Voice-note transcripts — fetched separately & tolerantly (the column may
  // not exist yet), so this can never break the feed.
  const transcriptById = new Map<string, string>();
  const audioIds = posts.flatMap((p) =>
    p.media.filter((m) => m.type === "audio").map((m) => m.id),
  );
  if (audioIds.length > 0) {
    const { data: trows } = await supabase
      .from("media")
      .select("id, transcript")
      .in("id", audioIds);
    for (const r of (trows ?? []) as { id: string; transcript: string | null }[]) {
      if (r.transcript) transcriptById.set(r.id, r.transcript);
    }
  }

  // Reactions (fire/heart/like) — fetched separately & tolerantly so a missing
  // table/column never breaks the feed.
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

  const tzByUser = new Map(
    members.map((m) => [m.user_id, m.profiles?.timezone ?? "America/New_York"]),
  );
  const totalActivities = activities.length;

  // A day only counts toward a streak when ALL activities were logged that day.
  // Aggregate the distinct activities each member logged per local day, then
  // keep only the days where they covered the full set.
  const actsByUserDay = new Map<string, Map<string, Set<string>>>();
  for (const p of posts) {
    const tz = tzByUser.get(p.author_id) ?? "America/New_York";
    const day = localDate(p.created_at, tz);
    let byDay = actsByUserDay.get(p.author_id);
    if (!byDay) {
      byDay = new Map();
      actsByUserDay.set(p.author_id, byDay);
    }
    let set = byDay.get(day);
    if (!set) {
      set = new Set<string>();
      byDay.set(day, set);
    }
    for (const pa of p.post_activities)
      if (activityById.has(pa.activity_id)) set.add(pa.activity_id);
  }
  const datesByUser = new Map<string, Set<string>>();
  for (const [uid, byDay] of actsByUserDay) {
    const tz = tzByUser.get(uid) ?? "America/New_York";
    const startDays = activities.map((a) => localDate(a.created_at, tz));
    datesByUser.set(uid, fullCompletionDays(byDay, startDays));
  }

  // Distinct activities each member has logged TODAY (their timezone). Drives
  // the progress ring and the compose button's "remaining/done" state.
  const todayActsByUser = new Map<string, Set<string>>();
  for (const p of posts) {
    const tz = tzByUser.get(p.author_id) ?? "America/New_York";
    if (localDate(p.created_at, tz) !== localDate(new Date(), tz)) continue;
    const set = todayActsByUser.get(p.author_id) ?? new Set<string>();
    for (const pa of p.post_activities)
      if (activityById.has(pa.activity_id)) set.add(pa.activity_id);
    todayActsByUser.set(p.author_id, set);
  }

  // Current user's remaining (un-logged) activities for today.
  const myLoggedToday = todayActsByUser.get(user.id) ?? new Set<string>();
  const remainingActivities = activities.filter((a) => !myLoggedToday.has(a.id));
  const allDoneToday =
    totalActivities > 0 && remainingActivities.length === 0;

  // Compute streak + today status per member, derive a display state, and sort
  // as a leaderboard (positive streaks on top, people slipping at the bottom).
  const roster = members
    .map((m) => {
      const tz = m.profiles?.timezone ?? "America/New_York";
      const info = computeStreak(datesByUser.get(m.user_id) ?? new Set(), tz);

      let state: "today" | "pending" | "out" | "new";
      let value: number | null;
      if (info.postedToday) {
        state = "today";
        value = info.streak;
      } else if (info.streak > 0) {
        state = "pending";
        value = info.streak;
      } else if (info.daysSince !== null) {
        state = "out";
        value = info.daysSince;
      } else {
        state = "new";
        value = null;
      }

      const sortKey = state === "out" ? -(value ?? 0) : (value ?? 0);

      const logged = todayActsByUser.get(m.user_id)?.size ?? 0;
      const progress = totalActivities > 0 ? logged / totalActivities : 0;
      const ringDone = totalActivities > 0 && logged >= totalActivities;

      return {
        id: m.user_id,
        name: m.profiles?.display_name ?? "Member",
        avatar: m.profiles?.avatar_url ?? null,
        ...info,
        state,
        value,
        sortKey,
        logged,
        progress,
        ringDone,
      };
    })
    .sort((a, b) => b.sortKey - a.sortKey || a.name.localeCompare(b.name));

  const me = roster.find((r) => r.id === user.id);
  const checkedInCount = roster.filter((r) => r.postedToday).length;

  return (
    <main className="board">
      <header className="board-head">
        <div className="board-head-top">
          <h1>{membership.groups.name}</h1>
          <div className="head-actions">
            <Tour
              userId={user.id}
              groupName={membership.groups.name}
              displayName={me?.name ?? "there"}
              avatarUrl={me?.avatar ?? null}
              inviteCode={membership.groups.invite_code}
              initialSeen={!!onboardedAt}
              trigger="none"
            />
            <HeaderBell userId={user.id} />
            <Link className="head-icon" href="/activities" aria-label="Settings">
              ⚙
            </Link>
          </div>
        </div>
        <p className="subtitle">
          {me && me.streak > 0 && (
            <span className="head-streak">{me.streak}🔥</span>
          )}
          <span>
            {checkedInCount} of {roster.length} checked in today
          </span>
        </p>
      </header>

      <NotifPrompt userId={user.id} />
      <InstallModal userId={user.id} onboarded={!!onboardedAt} />

      {/* Roster — everyone, whether they've checked in today, and their streak */}
      <section className="roster-board">
        {roster.map((r) => (
          <Link key={r.id} href={`/u/${r.id}`} className={`rb-card rb-${r.state}`}>
            <ProgressAvatar
              name={r.name}
              url={r.avatar}
              progress={r.progress}
              done={r.ringDone}
            />
            <span className="rb-line">
              <span className="rb-name">{r.name.split(" ")[0]}</span>
              <StreakPill state={r.state} value={r.value} />
            </span>
            <span className="rb-sub">
              {r.state === "today"
                ? `${r.logged}/${totalActivities} today`
                : subLabel(r.state, r.value)}
            </span>
          </Link>
        ))}
      </section>

      {/* Compose */}
      <Composer
        activities={remainingActivities}
        groupId={groupId}
        userId={user.id}
        done={allDoneToday}
        remainingCount={remainingActivities.length}
      />

      {/* Feed */}
      <section className="panel">
        <h2>Today &amp; recent</h2>
        {posts.length === 0 && (
          <p className="empty">No updates yet. Be the first to log today.</p>
        )}
        {posts.map((p) => {
          const author = memberInfo.get(p.author_id);
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
              authorId={p.author_id}
              authorName={author?.name ?? "Member"}
              authorAvatar={author?.avatar ?? null}
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

type RosterState = "today" | "pending" | "out" | "new";

function subLabel(state: RosterState, value: number | null): string {
  switch (state) {
    case "today":
      return "checked in";
    case "pending":
      return "not yet today";
    case "out":
      return `${value} ${value === 1 ? "day" : "days"} out`;
    case "new":
      return "no check-ins yet";
  }
}

function StreakPill({
  state,
  value,
}: {
  state: RosterState;
  value: number | null;
}) {
  if (state === "new") return <span className="pill pill-new">—</span>;
  if (state === "out")
    return <span className="pill pill-out">−{value}</span>;
  // today or pending — positive streak
  return (
    <span className={`pill pill-${state}`}>
      {value}
      <span className="flame">🔥</span>
    </span>
  );
}


function SignOut({ compact = false }: { compact?: boolean }) {
  return (
    <form action="/auth/signout" method="post" className={compact ? "signout-compact" : "signout"}>
      <button type="submit">{compact ? "Sign out" : "Sign out"}</button>
    </form>
  );
}
