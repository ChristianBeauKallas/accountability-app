"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Toggles whether the current player follows (saves) a program.
export function SaveButton({
  programId,
  playerId,
  initial,
  size = 18,
}: {
  programId: string;
  playerId: string;
  initial: boolean;
  size?: number;
}) {
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const next = !saved;
    setSaved(next);
    if (next) {
      await supabase
        .from("program_followers")
        .insert({ player_id: playerId, program_id: programId });
    } else {
      await supabase
        .from("program_followers")
        .delete()
        .eq("player_id", playerId)
        .eq("program_id", programId);
    }
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      aria-label={saved ? "Saved — tap to unsave" : "Save school"}
      aria-pressed={saved}
      className="flex h-8 w-8 items-center justify-center rounded-pill hover:bg-chip"
    >
      <Star
        size={size}
        strokeWidth={2}
        className={saved ? "fill-gold text-gold" : "text-muted-2"}
      />
    </button>
  );
}
