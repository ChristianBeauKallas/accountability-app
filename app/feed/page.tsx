import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/wellness-server";
import { computeStats, qualifyingDaysByMember } from "@/lib/wellness";
import { buildReactionMap, type ReactionRow } from "@/lib/reactions";
import { Avatar } from "@/components/ui/Avatar";
import { RunnerIcon, RunnerMark } from "@/components/wellness/Runner";
import { TabBar } from "@/components/wellness/TabBar";
import { InviteBanner } from "@/components/wellness/InviteBanner";
import { PostCard } from "@/components/wellness/PostCard";
import { AppTour } from "@/components/wellness/AppTour";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const { program, member, userId } = viewer;
  const supabase = createClient();

  const now = new Date();
  // Rolling recent feed (last 7 days) so posts don't vanish at midnight.
  const since = new Date(now.getTime() - 7 * 86400000).toISOString();
  const startYear = new Date(Date.UTC(now.getUTCFullYear() - 1, 11, 1)).toISOString();

  const { data: postsRaw } = await supabase
    .from("wl_checkins")
    .select("id, created_at, photo_url, photo_urls, place, description, duration_minutes, member_id")
    .eq("program_id", program.id)
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  const posts = (postsRaw ?? []) as any[];

  // Member names/avatars, fetched separately (a PostgREST embed here was
  // failing and returning an empty feed).
  const { data: membersRaw } = await supabase
    .from("wl_members")
    .select("id, name, avatar_url")
    .eq("program_id", program.id);
  const memberMap = new Map<string, { name: string; avatar_url: string | null }>();
  for (const mm of (membersRaw ?? []) as { id: string; name: string; avatar_url: string | null }[]) {
    memberMap.set(mm.id, { name: mm.name, avatar_url: mm.avatar_url });
  }

  const { data: mine } = await supabase
    .from("wl_checkins")
    .select("created_at, duration_minutes")
    .eq("member_id", userId)
    .gte("created_at", startYear);
  const stats = computeStats(mine ?? [], program);

  // Per-member qualifying days this month (for the badge on each post).
  const startMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
  const { data: monthRaw } = await supabase
    .from("wl_checkins")
    .select("member_id, created_at, duration_minutes")
    .eq("program_id", program.id)
    .gte("created_at", startMonth);
  const daysByMember = qualifyingDaysByMember(monthRaw ?? [], program, now);

  // Reactions for the visible posts.
  const postIds = posts.map((p) => p.id);
  let reactionRows: ReactionRow[] = [];
  if (postIds.length) {
    const { data: rx } = await supabase
      .from("wl_reactions")
      .select("checkin_id, emoji, member_id")
      .in("checkin_id", postIds);
    reactionRows = (rx ?? []) as ReactionRow[];
  }
  const reactionMap = buildReactionMap(postIds, reactionRows, userId);

  const R = 19;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - Math.min(1, stats.qualifyingDays / stats.goal));

  return (
    <div className="flex h-dvh flex-col">
      {/* app bar */}
      <header className="flex shrink-0 items-center justify-between gap-2.5 border-b border-border px-[18px] pb-3 pt-safe">
        <span className="inline-flex items-center gap-2 font-display font-bold text-ink">
          <span className="grid h-[26px] w-[26px] place-items-center rounded-[8px] bg-gradient-to-br from-accent to-accent-dark text-white">
            <RunnerIcon size={15} strokeWidth={2.2} />
          </span>
          Feed
        </span>
        <Link href="/me" aria-label="Your profile">
          <Avatar name={member.name} src={member.avatar_url} size={28} />
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-y-contain">
        <div className="flex flex-col gap-3.5 p-[18px]">
          {member.is_admin && <InviteBanner code={program.invite_code} />}

          {/* progress strip */}
          <Link
            href="/me"
            className="flex items-center gap-3 rounded-card border border-border bg-chip px-[15px] py-[13px]"
          >
            <svg width="46" height="46" viewBox="0 0 46 46" className="flex-none">
              <circle cx="23" cy="23" r={R} fill="none" stroke="rgb(var(--c-track))" strokeWidth="5" />
              <circle
                cx="23"
                cy="23"
                r={R}
                fill="none"
                stroke="rgb(var(--c-accent))"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={offset}
                transform="rotate(-90 23 23)"
              />
            </svg>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[0.95rem] font-bold text-ink">
                {stats.qualifyingDays} of {stats.goal} days
              </div>
              <div className="text-[0.74rem] text-muted">
                {stats.earnedThisMonth
                  ? "Goal reached — reward earned"
                  : `${stats.remaining} more to earn this month's reward`}
              </div>
            </div>
            <span className="text-muted">›</span>
          </Link>

          {/* feed */}
          {posts.length === 0 ? (
            <EmptyFeed />
          ) : (
            posts.map((p) => {
              const m = memberMap.get(p.member_id);
              return (
                <PostCard
                  key={p.id}
                  id={p.id}
                  photoUrls={p.photo_urls?.length ? p.photo_urls : p.photo_url ? [p.photo_url] : []}
                  place={p.place}
                  description={p.description}
                  durationMinutes={p.duration_minutes}
                  createdAt={p.created_at}
                  name={m?.name ?? "Member"}
                  avatarUrl={m?.avatar_url ?? null}
                  mine={p.member_id === userId}
                  daysLabel={`${daysByMember.get(p.member_id) ?? 0}/${program.days_goal} days`}
                  viewerId={userId}
                  reactions={reactionMap.get(p.id)!}
                  now={now}
                />
              );
            })
          )}
        </div>
      </div>

      <TabBar />
      <AppTour />
    </div>
  );
}

function EmptyFeed() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border bg-surface px-6 py-9 text-center">
      <RunnerMark tile={48} icon={24} radius={14} />
      <div>
        <p className="font-display text-base font-bold text-ink">No check-ins yet</p>
        <p className="mt-1 text-sm text-body-2">Be the first to check in — it only takes a few taps.</p>
      </div>
      <Link
        href="/log"
        className="mt-1 flex h-10 items-center justify-center rounded-cta bg-accent px-5 font-display text-sm font-semibold text-surface transition-colors hover:bg-accent-dark"
      >
        Log your movement
      </Link>
    </div>
  );
}
