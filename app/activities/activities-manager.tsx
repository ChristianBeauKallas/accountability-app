"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Activity } from "@/lib/types";

export default function ActivitiesManager({
  groupId,
  initial,
}: {
  groupId: string;
  initial: Activity[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Activity[]>(initial);
  const [newEmoji, setNewEmoji] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function edit(id: string, patch: Partial<Activity>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function save(a: Activity) {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("activities")
      .update({
        name: a.name.trim(),
        emoji: a.emoji || null,
        description: a.description?.trim() || null,
        prompt: a.prompt?.trim() || null,
      })
      .eq("id", a.id);
    if (error) setError(error.message);
    else router.refresh();
  }

  async function remove(id: string) {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("activities")
      .update({ active: false })
      .eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setRows((rs) => rs.filter((r) => r.id !== id));
    router.refresh();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const nextOrder =
      rows.reduce((max, r) => Math.max(max, r.sort_order), -1) + 1;
    const { data, error } = await supabase
      .from("activities")
      .insert({
        group_id: groupId,
        name: newName.trim(),
        emoji: newEmoji || null,
        description: newDesc.trim() || null,
        prompt: newPrompt.trim() || null,
        sort_order: nextOrder,
      })
      .select("*")
      .single();
    setBusy(false);
    if (error || !data) {
      setError(error?.message ?? "Could not add.");
      return;
    }
    setRows((rs) => [...rs, data as Activity]);
    setNewEmoji("");
    setNewName("");
    setNewDesc("");
    setNewPrompt("");
    router.refresh();
  }

  return (
    <div>
      <p className="subtitle" style={{ marginBottom: "1rem" }}>
        These are what your crew taps each day. Keep it short — 3 to 6 works
        best. Add a one-line description so everyone knows what each means.
      </p>

      <ul className="activity-editor">
        {rows.map((a) => (
          <li key={a.id} className="activity-edit-item">
            <div className="activity-row">
              <input
                className="emoji-input"
                value={a.emoji ?? ""}
                maxLength={2}
                placeholder="✅"
                onChange={(e) => edit(a.id, { emoji: e.target.value })}
                onBlur={() => save(a)}
                aria-label="Emoji"
              />
              <input
                className="name-input"
                value={a.name}
                onChange={(e) => edit(a.id, { name: e.target.value })}
                onBlur={() => save(a)}
                aria-label="Activity name"
              />
              <button
                type="button"
                className="remove-activity"
                onClick={() => remove(a.id)}
                aria-label="Remove activity"
              >
                ✕
              </button>
            </div>
            <input
              className="desc-input"
              value={a.description ?? ""}
              placeholder="One-line description (optional)"
              maxLength={80}
              onChange={(e) => edit(a.id, { description: e.target.value })}
              onBlur={() => save(a)}
              aria-label="Description"
            />
            <input
              className="desc-input"
              value={a.prompt ?? ""}
              placeholder={`Voice prompt (e.g. "What did you do for ${a.name}?")`}
              maxLength={80}
              onChange={(e) => edit(a.id, { prompt: e.target.value })}
              onBlur={() => save(a)}
              aria-label="Voice prompt"
            />
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="activity-add-item">
        <div className="activity-row">
          <input
            className="emoji-input"
            value={newEmoji}
            maxLength={2}
            placeholder="✨"
            onChange={(e) => setNewEmoji(e.target.value)}
            aria-label="New emoji"
          />
          <input
            className="name-input"
            value={newName}
            placeholder="Add an activity…"
            onChange={(e) => setNewName(e.target.value)}
            aria-label="New activity name"
          />
          <button type="submit" disabled={busy || !newName.trim()}>
            Add
          </button>
        </div>
        <input
          className="desc-input"
          value={newDesc}
          placeholder="One-line description (optional)"
          maxLength={80}
          onChange={(e) => setNewDesc(e.target.value)}
          aria-label="New description"
        />
        <input
          className="desc-input"
          value={newPrompt}
          placeholder='Voice prompt (optional, e.g. "Who did you connect with?")'
          maxLength={80}
          onChange={(e) => setNewPrompt(e.target.value)}
          aria-label="New voice prompt"
        />
      </form>

      {error && <p className="auth-error">{error}</p>}
    </div>
  );
}
