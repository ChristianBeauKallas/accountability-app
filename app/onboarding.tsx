"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Sensible starter activities for a new group. The owner can edit these later
// (member editing/voting is a v2 feature).
const DEFAULT_ACTIVITIES = [
  { name: "Movement", emoji: "🏃", sort_order: 0 },
  { name: "Ate clean", emoji: "🥗", sort_order: 1 },
  { name: "Water", emoji: "💧", sort_order: 2 },
  { name: "Sleep 7h+", emoji: "😴", sort_order: 3 },
  { name: "Read / grow", emoji: "📖", sort_order: 4 },
];

export default function Onboarding({ name }: { name?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [groupName, setGroupName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();

    const { data: groupId, error: rpcError } = await supabase.rpc(
      "create_group",
      { group_name: groupName.trim() },
    );

    if (rpcError || !groupId) {
      setError(rpcError?.message ?? "Could not create the group.");
      setBusy(false);
      return;
    }

    // Seed starter activities (the creator is the owner, so RLS allows this).
    const { error: seedError } = await supabase.from("activities").insert(
      DEFAULT_ACTIVITIES.map((a) => ({ ...a, group_id: groupId })),
    );
    if (seedError) {
      setError(seedError.message);
      setBusy(false);
      return;
    }

    router.refresh();
  }

  async function joinGroup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();

    const { error: rpcError } = await supabase.rpc("join_group", {
      code: code.trim(),
    });

    if (rpcError) {
      setError(rpcError.message);
      setBusy(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="onboarding">
      <div className="welcome-head">
        <h2>You&apos;re in{name ? `, ${name}` : ""} 👋</h2>
        <p>Last step — start your crew or join one.</p>
      </div>

      <div className="choice-cards">
        <button
          type="button"
          className={`choice-card ${mode === "create" ? "active" : ""}`}
          onClick={() => setMode("create")}
        >
          <span className="choice-icon">🚀</span>
          <span className="choice-title">Start a group</span>
          <span className="choice-sub">Name it, invite your people</span>
        </button>
        <button
          type="button"
          className={`choice-card ${mode === "join" ? "active" : ""}`}
          onClick={() => setMode("join")}
        >
          <span className="choice-icon">🔑</span>
          <span className="choice-title">Join a group</span>
          <span className="choice-sub">Paste an invite code</span>
        </button>
      </div>

      {mode === "create" ? (
        <form onSubmit={createGroup} className="auth-form">
          <label htmlFor="groupName">Group name</label>
          <input
            id="groupName"
            required
            placeholder="Morning Crew"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <button type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create group"}
          </button>
        </form>
      ) : (
        <form onSubmit={joinGroup} className="auth-form">
          <label htmlFor="code">Invite code</label>
          <input
            id="code"
            required
            placeholder="e.g. 9f3a2b1c4d5e"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button type="submit" disabled={busy}>
            {busy ? "Joining…" : "Join group"}
          </button>
        </form>
      )}

      {error && <p className="auth-error">{error}</p>}
    </div>
  );
}
