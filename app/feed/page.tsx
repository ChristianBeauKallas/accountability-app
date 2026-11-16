import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/wellness-server";
import { computeStats, qualifyingDaysByMember, timeAgo, tzStartOfDayISO } from "@/lib/wellness";
import { Avatar } from "@/components/ui/Avatar";
import { RunnerIcon, RunnerMark } from "@/components/wellness/Runner";
import { TabBar } from "@/components/wellness/TabBar";
import { InviteBanner } from "@/components/wellness/InviteBanner";
import { PostReactions, type ReactionState } from "@/components/wellness/PostReactions";

type EKey = "fire" | "thumb" | "heart";
const emptyReactions = (): ReactionState => ({
  fire: { count: 0, me: false },
  thumb: { count: 0, me: false },
  heart: { count: 0, me: false },
});

export const dynamic = "force-dynamic";

function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export default async function FeedPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const { program, member, userId } = viewer;
  const supabase = createClient();

  const now = new Date();
  const startToday = tzStartOfDayISO(now);
  const startYear = new Date(Date.UTC(now.getUTCFullYear() - 1, 11, 1)).toISOString();

  const { data: postsRaw } = await supabase
    .from("wl_checkins")
    .select(
      "id, created_at, photo_url, place, description, duration_minutes, member_id, member:wl_members(name, avatar_url)",
    )
    .eq("program_id", program.id)
    .gte("created_at", startToday)
    .order("created_at", { ascending: false });
  const posts = (postsRaw ?? []) as any[];

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

  // Reactions for today's posts.
  const postIds = posts.map((p) => p.id);
  const reactionMap = new Map<string, ReactionState>();
  posts.forEach((p) => reactionMap.set(p.id, emptyReactions()));
  if (postIds.length) {
    const { data: rx } = await supabase
      .from("wl_reactions")
      .select("checkin_id, emoji, member_id")
      .in("checkin_id", postIds);
    for (const r of (rx ?? []) as { checkin_id: string; emoji: EKey; member_id: string }[]) {
      const e = reactionMap.get(r.checkin_id);
      if (!e || !e[r.emoji]) continue;
      e[r.emoji].count++;
      if (r.member_id === userId) e[r.emoji].me = true;
    }
  }

  const R = 19;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - Math.min(1, stats.qualifyingDays / stats.goal));

  return (
    <div className="flex min-h-dvh flex-col">
      {/* app bar */}
      <header className="flex shrink-0 items-center justify-between gap-2.5 border-b border-border px-[18px] pb-3 pt-2.5">
        <span className="inline-flex items-center gap-2 font-display font-bold text-ink">
          <span className="grid h-[26px] w-[26px] place-items-center rounded-[8px] bg-gradient-to-br from-accent to-accent-dark text-white">
            <RunnerIcon size={15} strokeWidth={2.2} />
          </span>
          Today
        </span>
        <Link href="/me" aria-label="Your profile">
          <Avatar name={member.name} src={member.avatar_url} size={28} />
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto">
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
              const mine = p.member_id === userId;
              return (
                <article
                  key={p.id}
                  className={`overflow-hidden rounded-card border bg-surface shadow-card ${mine ? "border-accent ring-1 ring-accent" : "border-border"}`}
                >
                  <div className="flex items-center gap-2.5 p-[11px]">
                    <Avatar name={p.member?.name ?? "Member"} src={p.member?.avatar_url} size={34} />
                    <div className="min-w-0">
                      <div className="truncate text-[0.86rem] font-bold text-ink">
                        {p.member?.name ?? "Member"}
                      </div>
                      <div className="text-[0.72rem] text-muted">{timeAgo(p.created_at, now)}</div>
                    </div>
                    {mine && (
                      <span className="ml-auto rounded-pill bg-accent-soft px-2 py-[3px] text-[0.64rem] font-bold tracking-wide text-accent">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="relative aspect-square w-full bg-chip">
                    {p.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-accent-soft to-chip" />
                    )}
                    <span className="absolute right-2.5 top-2.5 rounded-pill bg-black/60 px-2 py-[5px] font-display text-[0.72rem] font-bold text-white backdrop-blur">
                      {p.duration_minutes}m
                    </span>
                    {p.place && (
                      <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-pill bg-black/60 px-2.5 py-[5px] text-[0.72rem] font-semibold text-white backdrop-blur">
                        <PinIcon />
                        {p.place}
                      </span>
                    )}
                    <span className="absolute bottom-2.5 right-2.5 rounded-pill bg-black/60 px-2.5 py-[5px] font-display text-[0.72rem] font-bold text-white backdrop-blur">
                      {daysByMember.get(p.member_id) ?? 0}/{program.days_goal} days
                    </span>
                  </div>
                  {p.description && (
                    <div className="px-[13px] pb-1 pt-2.5 text-[0.86rem] leading-snug text-body-2">
                      <b className="text-ink">{(p.member?.name ?? "Member").split(" ")[0]}</b>{" "}
                      {p.description}
                    </div>
                  )}
                  <PostReactions checkinId={p.id} memberId={userId} initial={reactionMap.get(p.id)!} />
                </article>
              );
            })
          )}
        </div>
      </div>

      <TabBar />
    </div>
  );
}

function EmptyFeed() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border bg-surface px-6 py-9 text-center">
      <RunnerMark tile={48} icon={24} radius={14} />
      <div>
        <p className="font-display text-base font-bold text-ink">Nothing logged yet today</p>
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
