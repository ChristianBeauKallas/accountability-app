"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CoachingTracker } from "@/lib/types";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"]; // ISO 1..7

type FormState = {
  id: string | null;
  label: string;
  emoji: string;
  wants_note: boolean;
  wants_photo: boolean;
  days: Set<number>; // empty = every day
};

const blankForm = (): FormState => ({
  id: null,
  label: "",
  emoji: "",
  wants_note: true,
  wants_photo: false,
  days: new Set(),
});

// Edit the personal-development habits on your own plan: add, remove, or change
// whether logging asks for a note (which brings the dictate tool) or a photo.
export default function HabitManager({
  relationshipId,
  trackers,
}: {
  relationshipId: string;
  trackers: CoachingTracker[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      return true;
    } catch (e) {
      setErr((e as Error)?.message ?? "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function startEdit(t: CoachingTracker) {
    setErr(null);
    setForm({
      id: t.id,
      label: t.label,
      emoji: t.emoji ?? "",
      wants_note: t.wants_note,
      wants_photo: t.wants_photo,
      days: new Set((t.days ?? []) as number[]),
    });
  }

  async function save() {
    if (!form) return;
    const days = form.days.size > 0 && form.days.size < 7 ? [...form.days] : null;
    const ok = await call({
      action: form.id ? "update" : "create",
      id: form.id ?? undefined,
      relationshipId: form.id ? undefined : relationshipId,
      label: form.label,
      emoji: form.emoji,
      wants_note: form.wants_note,
      wants_photo: form.wants_photo,
      days,
    });
    if (ok) {
      setForm(null);
      router.refresh();
    }
  }

  async function remove() {
    if (!form?.id) return;
    const ok = await call({ action: "delete", id: form.id });
    if (ok) {
      setForm(null);
      router.refresh();
    }
  }

  function toggleDay(d: number) {
    setForm((f) => {
      if (!f) return f;
      const days = new Set(f.days);
      if (days.has(d)) days.delete(d);
      else days.add(d);
      return { ...f, days };
    });
  }

  return (
    <>
      <button type="button" className="habit-manage-btn" onClick={() => setOpen(true)}>
        Edit
      </button>

      {open &&
        createPortal(
          <div className="tour-overlay" role="dialog" aria-modal="true">
            <div className="tour-card pm-card">
              {form ? (
                <>
                  <h2 className="tour-title">{form.id ? "Edit habit" : "New habit"}</h2>
                  <div className="habit-form">
                    <div className="habit-name-row">
                      <input
                        className="cf-input habit-emoji-in"
                        value={form.emoji}
                        maxLength={2}
                        placeholder="✅"
                        onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                        aria-label="Emoji"
                      />
                      <input
                        className="cf-input"
                        value={form.label}
                        placeholder="e.g. Read 20 min, Meditate…"
                        onChange={(e) => setForm({ ...form, label: e.target.value })}
                        aria-label="Habit name"
                      />
                    </div>

                    <label className="habit-toggle">
                      <input
                        type="checkbox"
                        checked={form.wants_note}
                        onChange={(e) => setForm({ ...form, wants_note: e.target.checked })}
                      />
                      <span>
                        Add a note when logging <em>(includes voice dictation)</em>
                      </span>
                    </label>
                    <label className="habit-toggle">
                      <input
                        type="checkbox"
                        checked={form.wants_photo}
                        onChange={(e) => setForm({ ...form, wants_photo: e.target.checked })}
                      />
                      <span>Let me add a photo</span>
                    </label>

                    <p className="habit-days-label">Days (leave all on for every day)</p>
                    <div className="habit-days">
                      {DAY_LABELS.map((lbl, i) => {
                        const d = i + 1;
                        const on = form.days.size === 0 || form.days.has(d);
                        return (
                          <button
                            key={i}
                            type="button"
                            className={`habit-day ${on ? "on" : ""}`}
                            onClick={() => toggleDay(d)}
                          >
                            {lbl}
                          </button>
                        );
                      })}
                    </div>

                    {err && <p className="auth-error">{err}</p>}

                    <div className="tour-nav">
                      {form.id ? (
                        <button
                          type="button"
                          className="pm-delete"
                          onClick={remove}
                          disabled={busy}
                        >
                          Delete
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="tour-back"
                          onClick={() => setForm(null)}
                          disabled={busy}
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="button"
                        className="tour-next"
                        onClick={save}
                        disabled={busy || !form.label.trim()}
                      >
                        {busy ? "Saving…" : "Save"}
                      </button>
                    </div>
                    {form.id && (
                      <button
                        type="button"
                        className="cf-cancel-link"
                        onClick={() => setForm(null)}
                        disabled={busy}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="tour-title">Personal development</h2>
                  <p className="tour-body">Add, edit, or remove the habits you&apos;re building.</p>
                  <div className="habit-list">
                    {trackers.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className="habit-item"
                        onClick={() => startEdit(t)}
                      >
                        <span className="habit-emoji">{t.emoji ?? "✅"}</span>
                        <span className="habit-label">{t.label}</span>
                        <span className="habit-flags">
                          {t.wants_note ? "📝" : ""}
                          {t.wants_photo ? "📷" : ""}
                          <span className="habit-edit">Edit ›</span>
                        </span>
                      </button>
                    ))}
                    {trackers.length === 0 && (
                      <p className="settings-hint dim">No habits yet — add your first below.</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="tour-action"
                    onClick={() => {
                      setErr(null);
                      setForm(blankForm());
                    }}
                  >
                    ＋ Add a habit
                  </button>
                  <div className="tour-nav">
                    <span />
                    <button type="button" className="tour-next" onClick={() => setOpen(false)}>
                      Done
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
