import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/wellness-server";
import { computeStats, formatHours, formatMoney, tzDay } from "@/lib/wellness";
import { Avatar } from "@/components/ui/Avatar";
import { TabBar } from "@/components/wellness/TabBar";
import { PostCard } from "@/components/wellness/PostCard";
import { ReplayTutorial } from "@/components/wellness/ReplayTutorial";
import { AppTour } from "@/components/wellness/AppTour";
import { buildReactionMap, type ReactionRow } from "@/lib/reactions";

export const dynamic = "force-dynamic";

function currentStreak(dayKeys: Set<string>, now: Date): number {
  let streak = 0;
  let cursor = new Date(now);
  // allow the streak to count from today or yesterday
  if (!dayKeys.has(tzDay(cursor))) {
    cursor = new Date(cursor.getTime() - 86400000);
    if (!dayKeys.has(tzDay(cursor))) return 0;
  }
  while (dayKeys.has(tzDay(cursor))) {
    streak++;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return streak;
}

export default async function ProfilePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const { program, member, userId } = viewer;
  const supabase = createClient();

  const now = new Date();
  const startYear = new Date(Date.UTC(now.getUTCFullYear() - 1, 11, 1)).toISOString();

  const { data: yearRaw } = await supabase
    .from("wl_checkins")
    .select("created_at, duration_minutes")
    .eq("member_id", userId)
    .gte("created_at", startYear);
  const year = yearRaw ?? [];
  const stats = computeStats(year, program);

  // The member's own check-ins, shown as full feed-style cards.
  const { data: postsRaw } = await supabase
    .from("wl_checkins")
    .select("id, created_at, photo_url, photo_urls, place, description, duration_minutes")
    .eq("member_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  const posts = (postsRaw ?? []) as any[];

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
  const daysLabel = `${stats.qualifyingDays}/${stats.goal} days`;

  const dayKeys = new Set(year.map((c) => tzDay(c.created_at)));
  const streak = currentStreak(dayKeys, now);

  const monthName = now.toLocaleString("en-US", { month: "long" });
  const monthHrs = (stats.totalMinutes / 60).toFixed(1);

  const R = 50;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - Math.min(1, stats.qualifyingDays / stats.goal));
  const bankPct = stats.bankCap > 0 ? Math.round((stats.bankedHours / stats.bankCap) * 100) : 0;

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center justify-between gap-2.5 border-b border-border px-[18px] pb-3 pt-safe">
        <h1 className="font-display text-lg font-bold text-ink">Your month</h1>
        {member.is_admin && (
          <Link
            href="/admin"
            className="rounded-btn border border-border bg-surface px-3 py-[7px] text-sm font-semibold text-ink"
          >
            Admin
          </Link>
        )}
      </header>

      <div className="flex-1 overflow-y-auto overscroll-y-contain">
        <div className="flex flex-col gap-3.5 p-[18px]">
          {/* identity */}
          <div className="flex items-center gap-3">
            <Avatar name={member.name} src={member.avatar_url} size={52} />
            <div className="min-w-0 flex-1">
              <div className="font-display text-[1.05rem] font-bold leading-tight text-ink">
                {member.name}
              </div>
              <div className="truncate text-[0.76rem] text-muted">{program.name}</div>
            </div>
          </div>

          {/* progress card */}
          <div className="flex items-center gap-4 rounded-card border border-border bg-gradient-to-br from-accent-soft to-surface p-[17px] shadow-card">
            <div className="relative h-[118px] w-[118px] flex-none">
              <svg width="118" height="118" viewBox="0 0 118 118">
                <circle cx="59" cy="59" r={R} fill="none" stroke="rgb(var(--c-track))" strokeWidth="11" />
                <circle
                  cx="59"
                  cy="59"
                  r={R}
                  fill="none"
                  stroke="rgb(var(--c-accent))"
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={offset}
                  transform="rotate(-90 59 59)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <b className="font-display text-[1.95rem] font-bold leading-none text-ink">
                  {stats.qualifyingDays}
                  <span className="text-[1rem] font-semibold text-muted">/{stats.goal}</span>
                </b>
                <span className="mt-0.5 text-[0.7rem] text-muted">days</span>
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="font-display text-[0.72rem] font-semibold uppercase tracking-[0.09em] text-accent">
                {monthName}
              </div>
              <div className="text-[0.95rem] leading-snug text-body-2">
                {stats.earnedThisMonth ? (
                  <b className="font-display text-ink">Reward earned</b>
                ) : (
                  <>
                    <b className="font-display text-ink">
                      {stats.remaining} more day{stats.remaining === 1 ? "" : "s"}
                    </b>{" "}
                    to earn your reward
                  </>
                )}
              </div>
              <span className="inline-flex max-w-max items-center gap-1.5 rounded-pill border border-border bg-surface px-3 py-1.5 font-display text-[0.82rem] font-bold text-accent shadow-card">
                Earn {formatHours(program.bank_hours_per_month)} hrs +{" "}
                {formatMoney(program.monthly_bonus_cents)}
              </span>
            </div>
          </div>

          {/* 3-up stats */}
          <div className="grid grid-cols-3 gap-2.5">
            <Stat value={monthHrs} unit="h" label="This month" />
            <Stat value={String(stats.activeDays)} label="Active days" />
            <Stat value={String(streak)} label="Day streak" />
          </div>

          {/* banked */}
          <div className="rounded-card border border-border bg-gradient-to-br from-gold-soft to-surface p-4 shadow-card">
            <div className="flex items-center justify-between gap-2.5">
              <span className="text-[0.8rem] font-semibold text-body-2">Banked wellness hours</span>
              <span className="font-display text-[1.35rem] font-bold tabular-nums text-ink">
                {formatHours(stats.bankedHours)}
                <span className="text-[0.78rem] font-semibold text-muted">/ {formatHours(stats.bankCap)} h</span>
              </span>
            </div>
            <div className="mt-2.5 h-[7px] overflow-hidden rounded-pill bg-track">
              <div className="h-full rounded-pill bg-gold" style={{ width: `${bankPct}%` }} />
            </div>
            <div className="mt-2 text-[0.7rem] text-muted">Rolls over · use as sick time</div>
          </div>

          {/* your check-ins */}
          <div className="px-0.5 pt-0.5 font-display text-[0.78rem] font-bold uppercase tracking-wide text-muted">
            Your check-ins
          </div>
          {posts.length === 0 ? (
            <div className="rounded-card border border-dashed border-border bg-surface px-5 py-8 text-center text-sm text-body-2">
              No check-ins yet. Tap the ＋ to log your first.
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {posts.map((p) => (
                <PostCard
                  key={p.id}
                  id={p.id}
                  photoUrls={p.photo_urls?.length ? p.photo_urls : p.photo_url ? [p.photo_url] : []}
                  place={p.place}
                  description={p.description}
                  durationMinutes={p.duration_minutes}
                  createdAt={p.created_at}
                  name={member.name}
                  avatarUrl={member.avatar_url}
                  mine
                  daysLabel={daysLabel}
                  viewerId={userId}
                  reactions={reactionMap.get(p.id)!}
                  now={now}
                  minsPerDay={program.mins_per_day}
                />
              ))}
            </div>
          )}

          <div className="pt-1">
            <ReplayTutorial />
          </div>
          <form action="/auth/signout" method="post">
            <button className="w-full rounded-btn border border-border bg-surface py-2.5 text-sm font-semibold text-muted">
              Log out
            </button>
          </form>
        </div>
      </div>

      <TabBar />
      <AppTour />
    </div>
  );
}

function Stat({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div className="rounded-[14px] border border-border bg-surface p-3.5 text-center shadow-card">
      <div className="font-display text-[1.5rem] font-bold leading-none tabular-nums text-ink">
        {value}
        {unit && <span className="text-[0.8rem] font-semibold text-muted">{unit}</span>}
      </div>
      <div className="mt-1.5 text-[0.68rem] font-semibold text-muted">{label}</div>
    </div>
  );
}
