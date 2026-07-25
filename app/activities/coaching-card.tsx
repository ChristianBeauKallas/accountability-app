"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Settings › Coaching: open your own log (if you're a client), see the people
// you coach, and start coaching a teammate (seeds their default trackers).
export default function CoachingCard({
  members,
  clients,
  isClient,
}: {
  members: { id: string; name: string }[];
  clients: { id: string; name: string }[];
  isClient: boolean;
}) {
  const router = useRouter();
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const coachedIds = new Set(clients.map((c) => c.id));
  const addable = members.filter((m) => !coachedIds.has(m.id));

  async function startCoaching() {
    if (!pick) return;
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("start_coaching", { client: pick });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    router.push(`/coach/${pick}`);
  }

  return (
    <div className="coaching-card">
      {isClient && (
        <Link href="/coaching" className="coaching-open">
          📓 Open your daily log ›
        </Link>
      )}

      <p className="settings-hint">People you coach</p>
      {clients.length === 0 && (
        <p className="settings-hint dim">No one yet.</p>
      )}
      <ul className="coach-client-list">
        {clients.map((c) => (
          <li key={c.id}>
            <Link href={`/coach/${c.id}`}>{c.name} ›</Link>
          </li>
        ))}
      </ul>

      {addable.length > 0 && (
        <div className="coach-add">
          <select
            className="coach-select"
            value={pick}
            onChange={(e) => setPick(e.target.value)}
          >
            <option value="">Coach a teammate…</option>
            {addable.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="coach-add-btn"
            onClick={startCoaching}
            disabled={!pick || busy}
          >
            {busy ? "…" : "Start"}
          </button>
        </div>
      )}
      {err && <p className="auth-error">{err}</p>}
    </div>
  );
}
