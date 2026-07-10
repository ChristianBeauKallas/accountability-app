"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Activity } from "@/lib/types";

export default function Composer({
  activities,
  groupId,
  userId,
  postedToday,
}: {
  activities: Activity[];
  groupId: string;
  userId: string;
  postedToday: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function post() {
    if (selected.size === 0 && !caption.trim()) {
      setError("Tap what you did today, or add a note.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();

    const { data: created, error: postError } = await supabase
      .from("group_posts")
      .insert({
        group_id: groupId,
        author_id: userId,
        caption: caption.trim() || null,
      })
      .select("id")
      .single();

    if (postError || !created) {
      setError(postError?.message ?? "Could not post.");
      setBusy(false);
      return;
    }

    if (selected.size > 0) {
      const { error: linkError } = await supabase.from("post_activities").insert(
        [...selected].map((activity_id) => ({
          post_id: created.id,
          activity_id,
        })),
      );
      if (linkError) {
        setError(linkError.message);
        setBusy(false);
        return;
      }
    }

    setSelected(new Set());
    setCaption("");
    setOpen(false);
    setBusy(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button className="post-cta" onClick={() => setOpen(true)}>
        {postedToday ? "Update again" : "Log today ›"}
      </button>
    );
  }

  return (
    <div className="composer">
      <p className="composer-label">What did you do today?</p>
      <div className="toggle-grid">
        {activities.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`toggle ${selected.has(a.id) ? "on" : ""}`}
            onClick={() => toggle(a.id)}
          >
            <span className="toggle-emoji">{a.emoji ?? "✅"}</span>
            {a.name}
          </button>
        ))}
      </div>

      <textarea
        className="composer-caption"
        placeholder="Add a note (optional)…"
        rows={2}
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
      />

      {error && <p className="auth-error">{error}</p>}

      <div className="composer-actions">
        <button
          type="button"
          className="ghost"
          onClick={() => setOpen(false)}
          disabled={busy}
        >
          Cancel
        </button>
        <button type="button" onClick={post} disabled={busy}>
          {busy ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}
