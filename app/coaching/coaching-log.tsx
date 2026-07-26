"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { transcribe, polish, estimateMacros } from "@/lib/ai";
import type { CoachingTracker, CoachingEntry, SavedMeal } from "@/lib/types";

function pickAudioMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const c = ["audio/webm", "audio/mp4", "audio/ogg"];
  return c.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

// Downscale a photo to a data URL for the estimate call (keeps it fast + cheap).
function fileToScaledDataUrl(file: File, max = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas"));
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => reject(new Error("bad image"));
    img.src = url;
  });
}

type Macros = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: "ai" | "edited";
};

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
  macros: Macros | null;
};

export default function CoachingLog({
  relationshipId,
  userId,
  trackers,
  initialEntries,
  streak,
  adherence,
  coachNote,
  macroTotals,
  savedMeals,
  recentMeals,
}: {
  relationshipId: string;
  userId: string;
  trackers: CoachingTracker[];
  initialEntries: CoachingEntry[];
  streak: number;
  adherence: number;
  coachNote: string | null;
  macroTotals: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  savedMeals: SavedMeal[];
  recentMeals: SavedMeal[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [mealSaved, setMealSaved] = useState(false);
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
    setMealSaved(false);
    setDraft({
      tracker,
      entry: null,
      when: toLocalInput(new Date().toISOString()),
      detail: "",
      amount: "",
      files: [],
      previews: [],
      macros: null,
    });
  }
  function openEdit(entry: CoachingEntry) {
    const tracker = trackerById.get(entry.tracker_id);
    if (!tracker) return;
    setErr(null);
    setMealSaved(false);
    setDraft({
      tracker,
      entry,
      when: toLocalInput(entry.happened_at),
      detail: entry.detail ?? "",
      amount: entry.amount != null ? String(entry.amount) : "",
      files: [],
      previews: entry.photos ?? [],
      macros:
        entry.calories != null
          ? {
              calories: entry.calories,
              protein_g: Number(entry.protein_g ?? 0),
              carbs_g: Number(entry.carbs_g ?? 0),
              fat_g: Number(entry.fat_g ?? 0),
              source: entry.macros_source === "edited" ? "edited" : "ai",
            }
          : null,
    });
  }
  function close() {
    setDraft(null);
    setErr(null);
  }

  // "Get macros" — estimate from the newly-added photo (if any) + the note.
  async function getMacros() {
    if (!draft) return;
    setEstimating(true);
    setErr(null);
    try {
      let image: string | null = null;
      if (draft.files[0]) image = await fileToScaledDataUrl(draft.files[0]);
      const m = await estimateMacros(image, draft.detail.trim());
      setDraft((d) =>
        d
          ? {
              ...d,
              macros: {
                calories: m.calories,
                protein_g: m.protein_g,
                carbs_g: m.carbs_g,
                fat_g: m.fat_g,
                source: "ai",
              },
            }
          : d,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't estimate macros.");
    }
    setEstimating(false);
  }

  function setMacroField(key: keyof Omit<Macros, "source">, value: string) {
    setDraft((d) =>
      d && d.macros
        ? {
            ...d,
            macros: { ...d.macros, [key]: Number(value) || 0, source: "edited" },
          }
        : d,
    );
  }

  function pickMeal(m: SavedMeal) {
    setDraft((d) =>
      d
        ? {
            ...d,
            detail: m.detail ?? m.name,
            macros:
              m.calories != null
                ? {
                    calories: m.calories,
                    protein_g: Number(m.protein_g ?? 0),
                    carbs_g: Number(m.carbs_g ?? 0),
                    fat_g: Number(m.fat_g ?? 0),
                    source: "ai",
                  }
                : d.macros,
          }
        : d,
    );
  }

  async function saveMealToLibrary() {
    if (!draft) return;
    const name = draft.detail.trim();
    if (!name) return;
    const supabase = createClient();
    const { error } = await supabase.from("coaching_saved_meals").insert({
      relationship_id: relationshipId,
      client_id: userId,
      name: name.slice(0, 80),
      detail: name,
      calories: draft.macros?.calories ?? null,
      protein_g: draft.macros?.protein_g ?? null,
      carbs_g: draft.macros?.carbs_g ?? null,
      fat_g: draft.macros?.fat_g ?? null,
    });
    if (!error) {
      setMealSaved(true);
      setTimeout(() => setMealSaved(false), 2000);
    }
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
    const macroFields = draft.macros
      ? {
          calories: draft.macros.calories,
          protein_g: draft.macros.protein_g,
          carbs_g: draft.macros.carbs_g,
          fat_g: draft.macros.fat_g,
          macros_source: draft.macros.source,
        }
      : {};

    let entryId = draft.entry?.id ?? null;
    if (entryId) {
      const { error } = await supabase
        .from("coaching_entries")
        .update({ happened_at, detail, amount, ...macroFields })
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
          ...macroFields,
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

      {macroTotals.calories > 0 && (
        <section className="macro-totals">
          <span className="mt-cal">{macroTotals.calories} kcal today</span>
          <span className="mt-macros">
            <b>{Math.round(macroTotals.protein_g)}g</b> P ·{" "}
            <b>{Math.round(macroTotals.carbs_g)}g</b> C ·{" "}
            <b>{Math.round(macroTotals.fat_g)}g</b> F
          </span>
        </section>
      )}

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
                  {e.calories != null && (
                    <span className="tl-macro">
                      {e.calories} kcal · {Math.round(Number(e.protein_g ?? 0))}P
                      · {Math.round(Number(e.carbs_g ?? 0))}C ·{" "}
                      {Math.round(Number(e.fat_g ?? 0))}F
                    </span>
                  )}
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

              {draft.tracker.wants_macros &&
                !draft.entry &&
                (savedMeals.length > 0 || recentMeals.length > 0) && (
                  <div className="meal-quick">
                    <label className="cf-label">Quick add a repeat</label>
                    <div className="meal-chips">
                      {savedMeals.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className="meal-chip saved"
                          onClick={() => pickMeal(m)}
                        >
                          ⭐{" "}
                          {m.name.length > 26
                            ? m.name.slice(0, 26) + "…"
                            : m.name}
                          {m.calories != null && (
                            <span className="meal-chip-cal">{m.calories}</span>
                          )}
                        </button>
                      ))}
                      {recentMeals.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className="meal-chip"
                          onClick={() => pickMeal(m)}
                        >
                          {m.name.length > 26
                            ? m.name.slice(0, 26) + "…"
                            : m.name}
                          {m.calories != null && (
                            <span className="meal-chip-cal">{m.calories}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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

              {draft.tracker.wants_macros && (
                <>
                  <button
                    type="button"
                    className="tour-action"
                    onClick={getMacros}
                    disabled={estimating}
                  >
                    {estimating
                      ? "Counting…"
                      : draft.macros
                        ? "🔍 Re-estimate macros"
                        : "🔍 Get macros"}
                  </button>
                  {draft.macros && (
                    <div className="macro-panel">
                      <div className="macro-grid">
                        <label>
                          Cal
                          <input
                            type="number"
                            inputMode="numeric"
                            value={draft.macros.calories}
                            onChange={(e) =>
                              setMacroField("calories", e.target.value)
                            }
                          />
                        </label>
                        <label>
                          Protein
                          <input
                            type="number"
                            inputMode="numeric"
                            value={draft.macros.protein_g}
                            onChange={(e) =>
                              setMacroField("protein_g", e.target.value)
                            }
                          />
                        </label>
                        <label>
                          Carbs
                          <input
                            type="number"
                            inputMode="numeric"
                            value={draft.macros.carbs_g}
                            onChange={(e) =>
                              setMacroField("carbs_g", e.target.value)
                            }
                          />
                        </label>
                        <label>
                          Fat
                          <input
                            type="number"
                            inputMode="numeric"
                            value={draft.macros.fat_g}
                            onChange={(e) =>
                              setMacroField("fat_g", e.target.value)
                            }
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        className="link-btn"
                        onClick={saveMealToLibrary}
                      >
                        {mealSaved ? "Saved to meals ✓" : "⭐ Save this meal"}
                      </button>
                    </div>
                  )}
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
