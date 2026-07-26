"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { transcribe, polish } from "@/lib/ai";
import type { CoachingTracker, CoachingEntry } from "@/lib/types";

function pickAudioMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const c = ["audio/webm", "audio/mp4", "audio/ogg"];
  return c.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

type Draft = {
  tracker: CoachingTracker;
  entry: CoachingEntry | null;
  when: string; // datetime-local value
  detail: string;
  amount: string;
  files: File[];
  previews: string[];
};

export default function CoachingLog({
  relationshipId,
  userId,
  trackers,
  initialEntries,
  streak,
  adherence,
  coachNote,
}: {
  relationshipId: string;
  userId: string;
  trackers: CoachingTracker[];
  initialEntries: CoachingEntry[];
  streak: number;
  adherence: number;
  coachNote: string | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [dictating, setDictating] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const trackerById = new Map(trackers.map((t) => [t.id, t]));
  const entries = [...initialEntries].sort((a, b) =>
    a.happened_at.localeCompare(b.happened_at),
  );

  // Per-tracker today summary for the quick-add chips.
  const countByTracker = new Map<string, number>();
  const sumByTracker = new Map<string, number>();
  for (const e of initialEntries) {
    countByTracker.set(e.tracker_id, (countByTracker.get(e.tracker_id) ?? 0) + 1);
    if (e.amount != null)
      sumByTracker.set(e.tracker_id, (sumByTracker.get(e.tracker_id) ?? 0) + e.amount);
  }

  function openNew(tracker: CoachingTracker) {
    setErr(null);
    setDraft({
      tracker,
      entry: null,
      when: toLocalInput(new Date().toISOString()),
      detail: "",
      amount: "",
      files: [],
      previews: [],
    });
  }
  function openEdit(entry: CoachingEntry) {
    const tracker = trackerById.get(entry.tracker_id);
    if (!tracker) return;
    setErr(null);
    setDraft({
      tracker,
      entry,
      when: toLocalInput(entry.happened_at),
      detail: entry.detail ?? "",
      amount: entry.amount != null ? String(entry.amount) : "",
      files: [],
      previews: entry.photos ?? [],
    });
  }
  function close() {
    setDraft(null);
    setErr(null);
  }

  // Dictate → transcribe → AI cleanup (with the tracker's prompt as context) →
  // drop the cleaned text into the note field for editing.
  async function startDictation() {
    if (!draft) return;
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickAudioMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        const type = chunksRef.current[0]?.type || mime || "audio/mp4";
        const blob = new Blob(chunksRef.current, { type });
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        if (blob.size === 0) return;
        setDictating(true);
        try {
          const raw = await transcribe(blob);
          const t = trackerById.get(draft.tracker.id);
          const context = t ? `${t.label} — ${t.prompt ?? ""}`.trim() : undefined;
          let clean = raw;
          try {
            clean = await polish(raw, context);
          } catch {
            /* keep raw */
          }
          setDraft((d) =>
            d ? { ...d, detail: d.detail ? `${d.detail} ${clean}` : clean } : d,
          );
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Couldn't transcribe.");
        }
        setDictating(false);
      };
      recorderRef.current = rec;
      rec.start(500);
      setRecording(true);
    } catch {
      setErr("Microphone access denied — you can type instead.");
    }
  }
  function stopDictation() {
    recorderRef.current?.stop();
  }

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!draft || files.length === 0) return;
    setDraft({
      ...draft,
      files: [...draft.files, ...files],
      previews: [...draft.previews, ...files.map((f) => URL.createObjectURL(f))],
    });
    if (fileInput.current) fileInput.current.value = "";
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const happened_at = new Date(draft.when).toISOString();
    const detail = draft.detail.trim() || null;
    const amount = draft.amount.trim() ? Number(draft.amount) : null;

    let entryId = draft.entry?.id ?? null;
    if (entryId) {
      const { error } = await supabase
        .from("coaching_entries")
        .update({ happened_at, detail, amount })
        .eq("id", entryId);
      if (error) return fail(error.message);
    } else {
      const { data, error } = await supabase
        .from("coaching_entries")
        .insert({
          relationship_id: relationshipId,
          client_id: userId,
          tracker_id: draft.tracker.id,
          happened_at,
          detail,
          amount,
        })
        .select("id")
        .single();
      if (error || !data) return fail(error?.message ?? "Couldn't save.");
      entryId = data.id as string;
    }

    // Upload any new photos.
    for (let i = 0; i < draft.files.length; i++) {
      const f = draft.files[i];
      const ext = f.name.split(".").pop() || "jpg";
      const path = `${userId}/coaching-${entryId}-${Date.now()}-${i}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, f, { contentType: f.type });
      if (upErr) return fail(upErr.message);
      const { error: mErr } = await supabase.from("media").insert({
        owner_id: userId,
        type: "image",
        storage_path: path,
        entry_id: entryId,
      });
      if (mErr) return fail(mErr.message);
    }

    setBusy(false);
    close();
    router.refresh();

    function fail(msg: string) {
      setErr(msg);
      setBusy(false);
    }
  }

  async function remove() {
    if (!draft?.entry) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("coaching_entries")
      .delete()
      .eq("id", draft.entry.id);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    close();
    router.refresh();
  }

  return (
    <main className="board coaching">
      <header className="board-head">
        <div className="board-head-top">
          <div>
            <h1>Your day</h1>
            <p className="subtitle">
              <Link href="/">‹ Feed</Link>
            </p>
          </div>
        </div>
      </header>

      <section className="coach-stats">
        <div className="cstat">
          <span className="cstat-n">{streak}🔥</span>
          <span className="cstat-l">Day streak</span>
        </div>
        <div className="cstat">
          <span className="cstat-n">{adherence}%</span>
          <span className="cstat-l">Logged today</span>
        </div>
      </section>

      {coachNote && (
        <div className="coach-note">
          <span className="coach-note-label">📣 From your coach</span>
          <p>{coachNote}</p>
        </div>
      )}

      {/* Quick add */}
      <section className="tracker-row">
        {trackers.map((t) => {
          const count = countByTracker.get(t.id) ?? 0;
          const sum = sumByTracker.get(t.id);
          let badge = "";
          if (t.wants_amount && sum != null)
            badge = `${sum}${t.target ? `/${t.target}` : ""}${t.unit ?? ""}`;
          else if (t.repeatable && count > 0) badge = `×${count}`;
          else if (count > 0) badge = "✓";
          return (
            <button
              key={t.id}
              type="button"
              className={`tracker-chip ${count > 0 ? "done" : ""}`}
              onClick={() => openNew(t)}
            >
              <span className="tc-emoji">{t.emoji ?? "✅"}</span>
              <span className="tc-label">{t.label}</span>
              {badge && <span className="tc-badge">{badge}</span>}
            </button>
          );
        })}
      </section>

      {/* Today's timeline */}
      <section className="panel">
        <h2>Today&apos;s log</h2>
        {entries.length === 0 && (
          <p className="empty">Nothing logged yet — tap a tracker above.</p>
        )}
        <div className="timeline">
          {entries.map((e) => {
            const t = trackerById.get(e.tracker_id);
            return (
              <button
                key={e.id}
                type="button"
                className="tl-entry"
                onClick={() => openEdit(e)}
              >
                <span className="tl-time">{fmtTime(e.happened_at)}</span>
                <span className="tl-emoji">{t?.emoji ?? "✅"}</span>
                <span className="tl-body">
                  <span className="tl-label">
                    {t?.label ?? "Logged"}
                    {e.amount != null && (
                      <span className="tl-amt">
                        {" "}
                        {e.amount}
                        {t?.unit ?? ""}
                      </span>
                    )}
                  </span>
                  {e.detail && <span className="tl-detail">{e.detail}</span>}
                </span>
                {e.photos && e.photos.length > 0 && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="tl-photo" src={e.photos[0]} alt="" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Add / edit sheet */}
      {draft &&
        createPortal(
          <div className="tour-overlay" role="dialog" aria-modal="true">
            <div className="tour-card pm-card">
              <h2 className="tour-title">
                {draft.tracker.emoji} {draft.tracker.label}
              </h2>

              <label className="cf-label">When</label>
              <input
                type="datetime-local"
                className="cf-input"
                value={draft.when}
                onChange={(e) => setDraft({ ...draft, when: e.target.value })}
              />

              {draft.tracker.wants_amount && (
                <>
                  <label className="cf-label">
                    Amount{draft.tracker.unit ? ` (${draft.tracker.unit})` : ""}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="cf-input"
                    value={draft.amount}
                    onChange={(e) =>
                      setDraft({ ...draft, amount: e.target.value })
                    }
                    placeholder="0"
                  />
                </>
              )}

              {draft.tracker.wants_note && (
                <>
                  <label className="cf-label">
                    {draft.tracker.prompt ?? "Notes"}
                  </label>
                  <textarea
                    className="pm-textarea"
                    rows={2}
                    value={draft.detail}
                    onChange={(e) =>
                      setDraft({ ...draft, detail: e.target.value })
                    }
                    placeholder={
                      dictating ? "Cleaning it up…" : draft.tracker.prompt ?? "…"
                    }
                  />
                  <div className="cf-dictate">
                    {recording ? (
                      <button
                        type="button"
                        className="dictate-btn recording"
                        onClick={stopDictation}
                      >
                        ● <span>Stop</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="dictate-btn"
                        onClick={startDictation}
                        disabled={dictating}
                      >
                        🎙️ <span>{dictating ? "Writing…" : "Dictate"}</span>
                      </button>
                    )}
                  </div>
                </>
              )}

              {draft.tracker.wants_photo && (
                <>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={onFiles}
                  />
                  {draft.previews.length > 0 && (
                    <div className="cf-photos">
                      {draft.previews.map((src, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={src} alt="" />
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    className="add-photo-btn"
                    onClick={() => fileInput.current?.click()}
                  >
                    📷 {draft.previews.length > 0 ? "Add another" : "Add photo"}
                  </button>
                </>
              )}

              {err && <p className="auth-error">{err}</p>}

              <div className="tour-nav">
                {draft.entry ? (
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
                    onClick={close}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  className="tour-next"
                  onClick={save}
                  disabled={busy}
                >
                  {busy ? "Saving…" : "Save"}
                </button>
              </div>
              {draft.entry && (
                <button
                  type="button"
                  className="cf-cancel-link"
                  onClick={close}
                  disabled={busy}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </main>
  );
}
