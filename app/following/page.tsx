import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { HeaderActions } from "@/components/HeaderActions";
import { FollowingList } from "@/components/player/FollowingList";
import { InboxView, type InboxRow } from "@/components/coach/InboxView";
import type { Program } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FollowingPage() {
  const { profile, userId } = await requireProfile();
  const supabase = createClient();

  if (profile.role === "coach") {
    const { data } = await supabase
      .from("applications")
      .select(
        "*, player:players(*, profile:profiles(full_name, avatar_url)), need:needs(*)"
      )
      .eq("status", "interested")
      .order("fit_score", { ascending: false });
    const rows = (data ?? []) as unknown as InboxRow[];

    return (
      <main className="px-5 pt-12">
        <div className="flex items-start justify-between">
          <p className="eyebrow">Shortlist</p>
          <HeaderActions />
        </div>
        <h1 className="mt-1 text-3xl font-display font-bold tracking-tight">
          Following
        </h1>
        <p className="mt-1 mb-5 text-[15px] text-body-2">
          {rows.length > 0
            ? `${rows.length} ${rows.length === 1 ? "player" : "players"} you've marked interested.`
            : "Players you mark interested are shortlisted here."}
        </p>
        <InboxView rows={rows} hideFilter />
      </main>
    );
  }

  // Player: saved schools
  const { data } = await supabase
    .from("program_followers")
    .select("program:programs(*)")
    .eq("player_id", userId)
    .order("created_at", { ascending: false });
  const programs = (data ?? [])
    .map((r) => (r as unknown as { program: Program | null }).program)
    .filter((p): p is Program => !!p);

  return (
    <main className="px-5 pt-12">
      <div className="flex items-center justify-end">
        <HeaderActions showBell />
      </div>
      <h1 className="mt-1 text-3xl font-display font-bold tracking-tight">
        Following
      </h1>
      <p className="mt-1 mb-5 text-[15px] text-body-2">
        {programs.length > 0
          ? `${programs.length} ${programs.length === 1 ? "school" : "schools"} you're keeping an eye on.`
          : "Schools you save show up here."}
      </p>
      <FollowingList programs={programs} userId={userId} />
    </main>
  );
}
