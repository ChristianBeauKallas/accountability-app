import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProfileScreen } from "@/components/player/ProfileScreen";
import type { Player } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PlayerProfilePage() {
  const { profile, userId } = await requireProfile("player");
  const supabase = createClient();

  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("id", userId)
    .single();

  if (!player) redirect("/onboarding");

  return <ProfileScreen profile={profile} player={player as Player} />;
}
