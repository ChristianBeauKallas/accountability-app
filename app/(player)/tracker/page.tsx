import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TrackerList, type TrackerRow } from "@/components/player/TrackerList";
import { MatchesInfo } from "@/components/player/MatchesInfo";
import { HeaderActions } from "@/components/HeaderActions";
import type { Program } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TrackerPage() {
  const { userId } = await requireProfile("player");
  const supabase = createClient();

  const { data } = await supabase
    .from("applications")
    .select("*, need:needs(*, program:programs(*))")
    .eq("player_id", userId)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as TrackerRow[];

  const { data: followData } = await supabase
    .from("program_followers")
    .select("program:programs(*)")
    .eq("player_id", userId)
    .order("created_at", { ascending: false });
  const followed = (followData ?? [])
    .map((f) => (f as unknown as { program: Program | null }).program)
    .filter((p): p is Program => !!p);

  return (
    <main className="px-5 pt-12">
      <div className="flex items-start justify-between">
        <p className="eyebrow">In the mix</p>
        <HeaderActions showBell />
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <h1 className="text-3xl font-display font-bold tracking-tight">
          My Spots
        </h1>
        <MatchesInfo />
      </div>
      <p className="mt-1 mb-5 text-[15px] text-body-2">
        {rows.length > 0
          ? "See where every coach stands on you — all in one place."
          : "Every spot you show interest in shows up here."}
      </p>
      <TrackerList rows={rows} followed={followed} userId={userId} />
    </main>
  );
}
