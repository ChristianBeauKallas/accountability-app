import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isEligible, computeFit, passesPlayerPrefs } from "@/lib/fit";
import { FitsFeed } from "@/components/player/FitsFeed";
import { FitsInfo } from "@/components/player/FitsInfo";
import { HeaderActions } from "@/components/HeaderActions";
import type { FeedItem } from "@/components/player/FitCard";
import type { Need, Player, Program } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FitsPage() {
  const { profile, userId } = await requireProfile("player");
  const supabase = createClient();

  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("id", userId)
    .single();

  const { data: appliedRows } = await supabase
    .from("applications")
    .select("need_id")
    .eq("player_id", userId);
  const appliedIds = new Set((appliedRows ?? []).map((r) => r.need_id));

  const { data: followRows } = await supabase
    .from("program_followers")
    .select("program_id")
    .eq("player_id", userId);
  const followedIds = (followRows ?? []).map((r) => r.program_id);

  const { data: needs } = await supabase
    .from("needs")
    .select("*, program:programs(*)")
    .eq("status", "open");

  let items: FeedItem[] = [];
  if (player) {
    const typedPlayer = player as Player;
    items = ((needs ?? []) as unknown as (Need & { program: Program })[])
      .filter((n) => n.program && !appliedIds.has(n.id))
      .filter((n) => isEligible(typedPlayer, n))
      .filter((n) => passesPlayerPrefs(typedPlayer, n.program))
      .map((n) => ({ need: n, fit: computeFit(typedPlayer, n, n.program) }))
      .sort((a, b) => b.fit - a.fit);
  }

  const first = profile.full_name?.split(" ")[0] || "there";

  return (
    <main className="px-5 pt-12">
      <div className="flex items-start justify-between">
        <p className="eyebrow">Hey {first}</p>
        <HeaderActions showBell />
      </div>
      <div className="mb-5 mt-1 flex items-center gap-1.5">
        <h1 className="text-3xl font-display font-bold tracking-tight">
          Recommended Fits
        </h1>
        <FitsInfo />
      </div>
      {player && (
        <FitsFeed
          userId={userId}
          player={player as Player}
          items={items}
          followedIds={followedIds}
        />
      )}
    </main>
  );
}
