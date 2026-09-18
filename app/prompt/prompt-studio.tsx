"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type VideoPrompt = {
  id: string;
  prompt: string;
  rating: string; // 'good' | 'bad' | 'unrated'
  recorded: boolean;
  difficulty?: string;
  created_at: string;
};

export default function PromptStudio({
  userId,
  initial,
}: {
  userId: string;
  initial: VideoPrompt[];
}) {
  const [list, setList] = useState<VideoPrompt[]>(initial);
  const [difficulty, setDifficulty] = useState<"normal" | "hard">("normal");
  const [busy, setBusy] = useState<null | "generate" | "seed">(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function startFresh() {
    setResetting(true);
    const supabase = createClient();
    await supabase.from("video_prompts").delete().eq("owner_id", userId);
    setList([]);
    setResetting(false);
    setConfirmReset(false);
  }

  const current = list[0] ?? null;
  const history = list.slice(1);

  async function bearer() {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token;
  }

  async function generate(action: "generate" | "seed") {
    setBusy(action);
    setErr(null);
    try {
      const token = await bearer();
      const res = await fetch("/api/video-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action, difficulty }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; prompt?: VideoPrompt; prompts?: VideoPrompt[]; error?: string }
        | null;
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      if (action === "seed" && json.prompts) {
        setList((l) => [...json.prompts!, ...l]);
      } else if (json.prompt) {
        setList((l) => [json.prompt!, ...l]);
      }
    } catch (e) {
      setErr((e as Error)?.message ?? "Couldn't generate.");
    } finally {
      setBusy(null);
    }
  }

  async function rate(id: string, rating: "good" | "bad") {
    const cur = list.find((p) => p.id === id);
    const next = cur?.rating === rating ? "unrated" : rating;
    setList((l) => l.map((p) => (p.id === id ? { ...p, rating: next } : p)));
    const supabase = createClient();
    await supabase
      .from("video_prompts")
      .update({ rating: next })
      .eq("id", id)
      .eq("owner_id", userId);
  }

  async function toggleRecorded(id: string) {
    const cur = list.find((p) => p.id === id);
    const next = !cur?.recorded;
    setList((l) => l.map((p) => (p.id === id ? { ...p, recorded: next } : p)));
    const supabase = createClient();
    await supabase
      .from("video_prompts")
      .update({ recorded: next })
      .eq("id", id)
      .eq("owner_id", userId);
  }

  const likedCount = list.filter((p) => p.rating === "good").length;

  return (
    <>
      <section className="panel vp-controls">
        <div className="vp-diff">
          <span className="vp-diff-label">Difficulty</span>
          <div className="vp-seg">
            <button
              type="button"
              className={difficulty === "normal" ? "on" : ""}
              onClick={() => setDifficulty("normal")}
            >
              Normal
            </button>
            <button
              type="button"
              className={difficulty === "hard" ? "on" : ""}
              onClick={() => setDifficulty("hard")}
            >
              Hard
            </button>
          </div>
        </div>
        <button
          type="button"
          className="btn-primary vp-gen"
          onClick={() => generate("generate")}
          disabled={!!busy}
        >
          {busy === "generate" ? "Thinking…" : "🎥 New prompt"}
        </button>
        {err && <p className="auth-error">{err}</p>}
        {list.length > 0 &&
          (confirmReset ? (
            <div className="vp-reset-confirm">
              <span>Delete all prompts &amp; ratings and start fresh?</span>
              <div className="vp-reset-btns">
                <button
                  type="button"
                  className="vp-seed-link"
                  onClick={() => setConfirmReset(false)}
                  disabled={resetting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="vp-reset-go"
                  onClick={startFresh}
                  disabled={resetting}
                >
                  {resetting ? "Clearing…" : "Delete all"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="vp-reset-link"
              onClick={() => setConfirmReset(true)}
            >
              ↺ Start fresh
            </button>
          ))}
      </section>

      {current ? (
        <section className="vp-current">
          <p className="vp-prompt">{current.prompt}</p>
          <div className="vp-actions">
            <button
              type="button"
              className={`vp-rate ${current.rating === "good" ? "good" : ""}`}
              onClick={() => rate(current.id, "good")}
            >
              👍 Good
            </button>
            <button
              type="button"
              className={`vp-rate ${current.rating === "bad" ? "bad" : ""}`}
              onClick={() => rate(current.id, "bad")}
            >
              👎 Miss
            </button>
            <button
              type="button"
              className={`vp-rec ${current.recorded ? "on" : ""}`}
              onClick={() => toggleRecorded(current.id)}
            >
              {current.recorded ? "✓ Recorded" : "Recorded?"}
            </button>
          </div>
        </section>
      ) : (
        <section className="vp-current empty">
          <p className="vp-empty">
            No prompts yet. Generate 10 to rate in one sitting — that gives the
            generator real signal on what you like from day one.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => generate("seed")}
            disabled={!!busy}
          >
            {busy === "seed" ? "Writing 10…" : "✨ Generate 10 to rate"}
          </button>
        </section>
      )}

      {history.length > 0 && (
        <section className="panel">
          <div className="vp-hist-head">
            <h2>History</h2>
            {list.length > 0 && (
              <button
                type="button"
                className="vp-seed-link"
                onClick={() => generate("seed")}
                disabled={!!busy}
              >
                {busy === "seed" ? "Writing 10…" : "+ 10 more"}
              </button>
            )}
          </div>
          <p className="vp-hint">{likedCount} liked so far — the more you rate, the sharper it gets.</p>
          {history.map((p) => (
            <div key={p.id} className={`vp-row ${p.rating}`}>
              <p className="vp-row-text">{p.prompt}</p>
              <div className="vp-row-actions">
                <button
                  type="button"
                  className={`vp-mini ${p.rating === "good" ? "good" : ""}`}
                  onClick={() => rate(p.id, "good")}
                  aria-label="Good"
                >
                  👍
                </button>
                <button
                  type="button"
                  className={`vp-mini ${p.rating === "bad" ? "bad" : ""}`}
                  onClick={() => rate(p.id, "bad")}
                  aria-label="Miss"
                >
                  👎
                </button>
                <button
                  type="button"
                  className={`vp-mini ${p.recorded ? "on" : ""}`}
                  onClick={() => toggleRecorded(p.id)}
                  aria-label="Recorded"
                >
                  🎬
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
