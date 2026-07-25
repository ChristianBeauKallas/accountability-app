"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Coach leaves one note per day; the client sees it on their log for that day.
export default function CoachFeedback({
  relationshipId,
  coachId,
  day,
  initial,
}: {
  relationshipId: string;
  coachId: string;
  day: string;
  initial: string;
}) {
  const [body, setBody] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    setSaved(false);
    const supabase = createClient();
    const text = body.trim();
    if (!text) {
      // Empty → clear any existing note for the day.
      await supabase
        .from("coaching_feedback")
        .delete()
        .eq("relationship_id", relationshipId)
        .eq("day", day);
    } else {
      const { error } = await supabase.from("coaching_feedback").upsert(
        {
          relationship_id: relationshipId,
          coach_id: coachId,
          day,
          body: text,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "relationship_id,day" },
      );
      if (error) {
        setErr(error.message);
        setBusy(false);
        return;
      }
    }
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="coach-fb">
      <textarea
        className="pm-textarea"
        rows={3}
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setSaved(false);
        }}
        placeholder="Leave a note for today — what to fix, what to keep doing…"
      />
      {err && <p className="auth-error">{err}</p>}
      <div className="coach-fb-actions">
        {saved && <span className="saved-tick">saved ✓</span>}
        <button
          type="button"
          className="tour-next"
          onClick={save}
          disabled={busy}
        >
          {busy ? "Saving…" : "Save note"}
        </button>
      </div>
    </div>
  );
}
