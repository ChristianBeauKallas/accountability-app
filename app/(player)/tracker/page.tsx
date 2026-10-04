import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TrackerList, type TrackerRow } from "@/components/player/TrackerList";
import { NotificationsBell } from "@/components/NotificationsBell";
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
        <NotificationsBell />
      </div>
      <h1 className="mt-1 text-3xl font-display font-bold tracking-tight">
        Matches
      </h1>
      <p className="mt-1 mb-5 text-[15px] text-body-2">
        {rows.length > 0
          ? `${rows.length} ${rows.length === 1 ? "spot" : "spots"} you're in for — you'll always know where you stand.`
          : "Every spot you put your name in shows up here."}
      </p>
      <TrackerList rows={rows} followed={followed} />
    </main>
  );
}
