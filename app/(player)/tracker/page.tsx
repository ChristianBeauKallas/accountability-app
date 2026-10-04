import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TrackerList, type TrackerRow } from "@/components/player/TrackerList";

export const dynamic = "force-dynamic";

export default async function TrackerPage() {
  const { userId } = await requireProfile("player");
  const supabase = createClient();

  const { data } = await supabase
    .from("applications")
    .select("*, need:needs(*, program:programs(*))")
    .eq("player_id", userId)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as TrackerRow[];

  return (
    <main className="px-5 pt-12">
      <p className="eyebrow">Applications</p>
      <h1 className="mt-1 text-3xl font-display font-bold tracking-tight">
        Tracker
      </h1>
      <p className="mt-1 mb-5 text-[15px] text-body-2">
        {rows.length > 0
          ? `${rows.length} ${rows.length === 1 ? "application" : "applications"} — every one, no ghosting.`
          : "Everywhere you apply shows up here."}
      </p>
      <TrackerList rows={rows} />
    </main>
  );
}
