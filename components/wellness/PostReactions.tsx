"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EMOJI, type EKey, type ReactionState } from "@/lib/reactions";

const KEYS = Object.keys(EMOJI) as EKey[];

export function PostReactions({
  checkinId,
  memberId,
  initial,
}: {
  checkinId: string;
  memberId: string;
  initial: ReactionState;
}) {
  const [state, setState] = useState<ReactionState>(initial);

  async function toggle(k: EKey) {
    const cur = state[k];
    const nextMe = !cur.me;
    setState((s) => ({ ...s, [k]: { me: nextMe, count: Math.max(0, cur.count + (nextMe ? 1 : -1)) } }));

    const supabase = createClient();
    try {
      if (nextMe) {
        await supabase.from("wl_reactions").insert({ checkin_id: checkinId, member_id: memberId, emoji: k });
      } else {
        await supabase
          .from("wl_reactions")
          .delete()
          .eq("checkin_id", checkinId)
          .eq("member_id", memberId)
          .eq("emoji", k);
      }
    } catch {
      setState((s) => ({ ...s, [k]: cur }));
    }
  }

  return (
    <div className="flex gap-2 px-[13px] pb-3 pt-1">
      {KEYS.map((k) => (
        <button
          key={k}
          onClick={() => toggle(k)}
          aria-pressed={state[k].me}
          className={`inline-flex items-center gap-1 rounded-pill border px-2.5 py-1 text-[0.9rem] transition-colors ${
            state[k].me ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-accent"
          }`}
        >
          <span className="leading-none">{EMOJI[k]}</span>
          {state[k].count > 0 && (
            <span className={`font-display text-[0.72rem] font-bold ${state[k].me ? "text-accent" : "text-muted"}`}>
              {state[k].count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
