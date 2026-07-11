"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function FireButton({
  postId,
  userId,
  initialCount,
  initialMine,
}: {
  postId: string;
  userId: string;
  initialCount: number;
  initialMine: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [mine, setMine] = useState(initialMine);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    const next = !mine;
    // Optimistic.
    setMine(next);
    setCount((c) => c + (next ? 1 : -1));

    const { error } = next
      ? await supabase
          .from("post_reactions")
          .insert({ post_id: postId, user_id: userId })
      : await supabase
          .from("post_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId);

    if (error) {
      // Roll back on failure.
      setMine(!next);
      setCount((c) => c + (next ? -1 : 1));
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      className={`fire-btn ${mine ? "lit" : ""}`}
      onClick={toggle}
      aria-label="React with fire"
    >
      <span className="fire-emoji">🔥</span>
      {count > 0 && <span className="fire-count">{count}</span>}
    </button>
  );
}
