import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isEligible, computeFit, passesPlayerPrefs } from "@/lib/fit";
import { FitsFeed } from "@/components/player/FitsFeed";
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
      <p className="eyebrow">Hey {first}</p>
      <h1 className="mt-1 text-3xl font-display font-bold tracking-tight">
        Your fits
      </h1>
      <p className="mt-1 mb-5 text-[15px] text-body-2">
        {items.length > 0
          ? `${items.length} ${items.length === 1 ? "spot fits" : "spots fit"} you right now.`
          : "Spots you fit will show up here."}
      </p>
      {player && <FitsFeed userId={userId} player={player as Player} items={items} />}
    </main>
  );
}
