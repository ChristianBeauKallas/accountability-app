"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ReactState = { count: number; mine: boolean };

const TYPES = [
  { type: "fire", emoji: "🔥" },
  { type: "heart", emoji: "❤️" },
  { type: "like", emoji: "👍" },
] as const;

export default function ReactionBar({
  postId,
  userId,
  initial,
}: {
  postId: string;
  userId: string;
  initial: Record<string, ReactState>;
}) {
  const [state, setState] = useState<Record<string, ReactState>>(() => ({
    fire: initial.fire ?? { count: 0, mine: false },
    heart: initial.heart ?? { count: 0, mine: false },
    like: initial.like ?? { count: 0, mine: false },
  }));
  const [busy, setBusy] = useState(false);

  async function toggle(type: string) {
    if (busy) return;
    setBusy(true);
    const next = !state[type].mine;
    setState((s) => ({
      ...s,
      [type]: { count: s[type].count + (next ? 1 : -1), mine: next },
    }));

    const supabase = createClient();
    const { error } = next
      ? await supabase
          .from("post_reactions")
          .insert({ post_id: postId, user_id: userId, type })
      : await supabase
          .from("post_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId)
          .eq("type", type);

    if (error) {
      // Roll back.
      setState((s) => ({
        ...s,
        [type]: { count: s[type].count + (next ? -1 : 1), mine: !next },
      }));
    }
    setBusy(false);
  }

  return (
    <div className="reaction-bar">
      {TYPES.map(({ type, emoji }) => (
        <button
          key={type}
          type="button"
          className={`react-btn ${state[type].mine ? "on" : ""}`}
          onClick={() => toggle(type)}
          aria-label={type}
        >
          <span className="react-emoji">{emoji}</span>
          {state[type].count > 0 && (
            <span className="react-count">{state[type].count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
