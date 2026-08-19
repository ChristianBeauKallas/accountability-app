"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { transcribe, polish, estimateMacros } from "@/lib/ai";
import { syncPlanRecap } from "@/lib/plan-recap";
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
function fmtDay(d: string): string {
  return new Date(d + "T12:00:00").toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Turn an exercise into a clean one-liner. Only show a "N×" multiplier for
// real multi-set work (lifts); a single set (a run segment) just shows its
// prescription — no meaningless "1×".
function exLine(name: string, sets?: number, reps?: string): string {
  const r = (reps ?? "").trim();
  let scheme = "";
  if (sets && sets > 1) scheme = r ? `${sets}×${r}` : `${sets} sets`;
  else scheme = r;
  return scheme ? `${name} — ${scheme}` : name;
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
  todayWeekday,
  targets,
  planSummary,
  todayWorkout,
  displayName = "Your",
  today,
  selectedDay,
  isToday = true,
  prevHref,
  nextHref,
  buildBanner,
  manageHref,
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
  todayWeekday?: number | null;
  targets?: {
    calorie: number | null;
    protein: number | null;
    water: number | null;
  } | null;
  planSummary?: string | null;
  todayWorkout?: {
    title: string;
    detail: string | null;
    exercises: { name: string; sets?: number; reps?: string; cue?: string }[] | null;
    planWorkoutId: string | null;
    adjusted: boolean;
    adjustNote: string | null;
    adjustReason: string | null;
  } | null;
  displayName?: string;
  today?: string;
  selectedDay?: string;
  isToday?: boolean;
  prevHref?: string | null;
  nextHref?: string | null;
  buildBanner?: { text: string; href: string | null } | null;
  manageHref?: string | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [mealSaved, setMealSaved] = useState(false);
  const [shareToFeed, setShareToFeed] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const firstName = displayName.split(" ")[0];
  const possessive = /s$/i.test(firstName) ? `${firstName}'` : `${firstName}'s`;
  const fileInput = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // "Make adjustments" — talk through how you feel, AI reworks today's session.
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustRec, setAdjustRec] = useState(false);
  const [adjustWriting, setAdjustWriting] = useState(false);
  const [adjustBusy, setAdjustBusy] = useState(false);
  const [adjustErr, setAdjustErr] = useState<string | null>(null);
  const [proposal, setProposal] = useState<{
    title: string;
    kind: string;
    detail: string | null;
    reason: string | null;
    exercises: { name: string; sets?: number; reps?: string; cue?: string }[];
  } | null>(null);
  const adjRecRef = useRef<MediaRecorder | null>(null);
  const adjChunks = useRef<Blob[]>([]);

  const trackerById = new Map(trackers.map((t) => [t.id, t]));
  // On a plan, only show what's due today (trackers with no days = every day).
  const visibleTrackers = todayWeekday
    ? trackers.filter(
        (t) => !t.days || t.days.length === 0 || t.days.includes(todayWeekday),
      )
    : trackers;
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

  function defaultWhen(): string {
    // Backdating: default the timestamp to the viewed day (noon), not "now".
    if (isToday || !selectedDay) return toLocalInput(new Date().toISOString());
    return toLocalInput(new Date(selectedDay + "T12:00:00").toISOString());
  }

  function openNew(tracker: CoachingTracker) {
    setErr(null);
    setMealSaved(false);
    setShareToFeed(false);
    setDraft({
      tracker,
      entry: null,
      when: defaultWhen(),
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
    setShareToFeed(false);
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

  // A pure checkmark tracker (no note/photo/amount/macros) logs with one tap.
  const isCheckOnly = (t: CoachingTracker) =>
    !t.wants_note && !t.wants_photo && !t.wants_amount && !t.wants_macros;

  const [quickBusy, setQuickBusy] = useState<string | null>(null);
  async function quickToggle(t: CoachingTracker) {
    if (quickBusy) return;
    setQuickBusy(t.id);
    const supabase = createClient();
    const existing = initialEntries.filter((e) => e.tracker_id === t.id);
    if (existing.length > 0) {
      await supabase
        .from("coaching_entries")
        .delete()
        .in("id", existing.map((e) => e.id));
    } else {
      const when =
        isToday || !selectedDay
          ? new Date().toISOString()
          : new Date(selectedDay + "T12:00:00").toISOString();
      await supabase.from("coaching_entries").insert({
        relationship_id: relationshipId,
        client_id: userId,
        tracker_id: t.id,
        happened_at: when,
      });
    }
    setQuickBusy(null);
    void syncPlanRecap(selectedDay ?? today ?? new Date().toISOString().slice(0, 10));
    router.refresh();
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
    // A meal needs a photo — it's what makes the macro estimate trustworthy.
    if (draft.tracker.wants_macros && draft.previews.length === 0) {
      setErr("Add a photo of your meal first.");
      return;
    }
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

    // Optional explicit share of a private entry (weigh-in / progress selfie).
    if (
      shareToFeed &&
      entryId &&
      /weight|scale|weigh|selfie|progress|photo/i.test(draft.tracker.label)
    ) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await fetch("/api/share-to-feed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ entryId }),
      }).catch(() => {});
    }

    setBusy(false);
    close();
    void syncPlanRecap(draft.when.slice(0, 10));
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
    void syncPlanRecap(draft.when.slice(0, 10));
    router.refresh();
  }

  // ---- Make adjustments ----
  async function startAdjustDictation() {
    setAdjustErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickAudioMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      adjChunks.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && adjChunks.current.push(e.data);
      rec.onstop = async () => {
        const type = adjChunks.current[0]?.type || mime || "audio/mp4";
        const blob = new Blob(adjChunks.current, { type });
        stream.getTracks().forEach((t) => t.stop());
        setAdjustRec(false);
        if (blob.size === 0) return;
        setAdjustWriting(true);
        try {
          const rawTxt = await transcribe(blob);
          let clean = rawTxt;
          try {
            clean = await polish(rawTxt, "How the client feels + what to change about today's workout");
          } catch {
            /* keep raw */
          }
          setAdjustNote((n) => (n ? `${n} ${clean}` : clean));
        } catch (e) {
          setAdjustErr(e instanceof Error ? e.message : "Couldn't transcribe.");
        }
        setAdjustWriting(false);
      };
      adjRecRef.current = rec;
      rec.start(500);
      setAdjustRec(true);
    } catch {
      setAdjustErr("Microphone access denied — you can type instead.");
    }
  }

  async function proposeAdjustment() {
    if (!adjustNote.trim()) return;
    setAdjustBusy(true);
    setAdjustErr(null);
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch("/api/adjust-workout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        relationshipId,
        planWorkoutId: todayWorkout?.planWorkoutId ?? null,
        note: adjustNote.trim(),
      }),
    });
    setAdjustBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setAdjustErr(d.error ?? "Couldn't build the adjustment.");
      return;
    }
    setProposal(await res.json());
  }

  async function applyAdjustment() {
    if (!proposal || !today) return;
    setAdjustBusy(true);
    setAdjustErr(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("coaching_workout_adjustments")
      .upsert(
        {
          relationship_id: relationshipId,
          client_id: userId,
          plan_workout_id: todayWorkout?.planWorkoutId ?? null,
          day: today,
          title: proposal.title,
          detail: proposal.detail,
          exercises: proposal.exercises,
          note: adjustNote.trim() || null,
          reason: proposal.reason,
        },
        { onConflict: "relationship_id,day" },
      );
    setAdjustBusy(false);
    if (error) {
      setAdjustErr(error.message);
      return;
    }
    closeAdjust();
    router.refresh();
  }

  function closeAdjust() {
    setAdjustOpen(false);
    setProposal(null);
    setAdjustNote("");
    setAdjustErr(null);
  }

  // Sort today's trackers into the labeled zones.
  function zoneOf(t: CoachingTracker): "workout" | "meal" | "water" | "weight" | "photo" | "dev" {
    const l = t.label.toLowerCase();
    if (/workout|exercise|training|\blift\b|\brun\b|cardio/.test(l)) return "workout";
    if (t.wants_macros || /meal|eat|food|nutrition|breakfast|lunch|dinner|snack/.test(l)) return "meal";
    if (/water|drink|hydrat/.test(l) || t.unit === "oz") return "water";
    if (/weight|scale|weigh/.test(l)) return "weight";
    if (/selfie|progress|photo/.test(l)) return "photo";
    return "dev";
  }
  const mealTrackers = visibleTrackers.filter((t) => zoneOf(t) === "meal");
  const waterTrackers = visibleTrackers.filter((t) => zoneOf(t) === "water");
  const devTrackers = visibleTrackers.filter((t) => zoneOf(t) === "dev");
  const workoutTrackers = visibleTrackers.filter((t) => zoneOf(t) === "workout");
  const weightTracker = visibleTrackers.find((t) => zoneOf(t) === "weight") ?? null;
  const photoTracker = visibleTrackers.find((t) => zoneOf(t) === "photo") ?? null;
  const doneCount = (t: CoachingTracker) => countByTracker.get(t.id) ?? 0;

  // A compact tracker row used inside the Meals / Personal-development zones.
  const trackerRow = (t: CoachingTracker) => {
    const count = doneCount(t);
    const sum = sumByTracker.get(t.id);
    let badge = "";
    if (t.wants_amount && sum != null)
      badge = `${sum}${t.target ? `/${t.target}` : ""}${t.unit ?? ""}`;
    else if (t.repeatable && count > 0) badge = `×${count}`;
    const check = isCheckOnly(t);
    // Repeatable trackers always show a "＋" so it's clear you can log another.
    const canAddMore = !check && (t.repeatable || count === 0);
    return (
      <button
        key={t.id}
        type="button"
        className="zrow"
        disabled={quickBusy === t.id}
        onClick={() => (check ? quickToggle(t) : openNew(t))}
      >
        <span className={`zrow-check ${count > 0 ? "done" : ""}`}>
          {count > 0 ? "✓" : ""}
        </span>
        <span className="zrow-emoji">{t.emoji ?? "✅"}</span>
        <span className="zrow-label">{t.label}</span>
        {badge && <span className="zrow-badge">{badge}</span>}
        {canAddMore && <span className="zrow-add">＋</span>}
      </button>
    );
  };

  return (
    <main className="board coaching">
      <header className="board-head">
        <div className="board-head-top">
          <div>
            <h1>{displayName === "Your" ? "Your plan" : `${possessive} plan`}</h1>
            <p className="subtitle">
              <Link href="/">‹ Feed</Link>
            </p>
          </div>
          {manageHref && (
            <Link href={manageHref} className="head-icon" aria-label="Adjust plan">
              ⚙
            </Link>
          )}
        </div>
      </header>

      {selectedDay && (
        <nav className="day-nav">
          {prevHref ? (
            <Link href={prevHref} className="day-nav-btn" aria-label="Previous day">
              ‹
            </Link>
          ) : (
            <span className="day-nav-btn disabled">‹</span>
          )}
          <label className="day-nav-date">
            <span>{isToday ? "Today" : fmtDay(selectedDay)} ▾</span>
            <input
              type="date"
              value={selectedDay}
              max={today}
              onChange={(e) => {
                if (e.target.value) router.push(`/coaching?d=${e.target.value}`);
              }}
            />
          </label>
          {nextHref ? (
            <Link href={nextHref} className="day-nav-btn" aria-label="Next day">
              ›
            </Link>
          ) : (
            <span className="day-nav-btn disabled">›</span>
          )}
        </nav>
      )}

      {!isToday && (
        <div className="backdate-note">
          📅 Viewing a past day — anything you log saves to this date.
        </div>
      )}

      {buildBanner &&
        (buildBanner.href ? (
          <Link href={buildBanner.href} className="plan-banner build">
            {buildBanner.text} ›
          </Link>
        ) : (
          <div className="plan-banner wait">{buildBanner.text}</div>
        ))}

      {planSummary && <div className="plan-banner">📋 {planSummary}</div>}

      {/* Lightweight progress ribbon */}
      <section className="day-ribbon">
        <div className="dr-stat">
          <b>{streak}🔥</b>
          <span>Streak</span>
        </div>
        <div className="dr-div" />
        <div className="dr-track">
          <div className="dr-bar">
            <div className="dr-fill" style={{ width: `${adherence}%` }} />
          </div>
          <span className="dr-lbl">{adherence}% logged today</span>
        </div>
      </section>

      {coachNote && (
        <div className="coach-note">
          <span className="coach-note-label">📣 From your coach</span>
          <p>{coachNote}</p>
        </div>
      )}

      {/* ── Zone: Workout ── */}
      {(todayWorkout || workoutTrackers.length > 0) && (
        <section className="zone">
          <div className="zone-head">
            <div className="eyebrow">
              <span className="zdot run">🏃</span> Today&apos;s workout
            </div>
            <p className="zone-help">
              Your session for today — log it when you&apos;re done, or adjust it first.
            </p>
          </div>

          {todayWorkout ? (
            <div className="workout-card">
              <button
                type="button"
                className="wc-head"
                onClick={() => setWorkoutOpen((o) => !o)}
                aria-expanded={workoutOpen}
              >
                <span className="wc-title">{todayWorkout.title}</span>
                <span className={`wc-tag ${todayWorkout.adjusted ? "adj" : ""}`}>
                  {todayWorkout.adjusted ? "✦ Adjusted" : "Today"}
                </span>
                <span className={`wc-chevron ${workoutOpen ? "open" : ""}`}>▾</span>
              </button>

              {workoutOpen && (
                <>
                  {todayWorkout.detail && (
                    <p className="wc-detail">{todayWorkout.detail}</p>
                  )}
                  {todayWorkout.exercises && todayWorkout.exercises.length > 0 && (
                    <ul className="wc-ex">
                      {todayWorkout.exercises.map((e, i) => (
                        <li key={i}>
                          <span className="wc-ex-name">{exLine(e.name, e.sets, e.reps)}</span>
                          {e.cue && <span className="wc-cue">{e.cue}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {todayWorkout.adjusted && todayWorkout.adjustReason && (
                    <p className="wc-reason">✦ {todayWorkout.adjustReason}</p>
                  )}
                </>
              )}
              <div className="wc-actions">
                <Link
                  href={
                    isToday || !selectedDay
                      ? "/coaching/workout"
                      : `/coaching/workout?d=${selectedDay}`
                  }
                  className="wc-log-btn"
                >
                  🏋️ Log workout
                </Link>
                {isToday && (
                  <button
                    type="button"
                    className="wc-adjust-btn"
                    onClick={() => setAdjustOpen(true)}
                  >
                    🎙️ {todayWorkout.adjusted ? "Adjust again" : "Make adjustments"}
                  </button>
                )}
              </div>
              {isToday && (
                <p className="wc-hint">
                  Sore, short on time, low energy? Tell us and we&apos;ll adapt today&apos;s session.
                </p>
              )}
            </div>
          ) : (
            <div className="zone-card">{workoutTrackers.map(trackerRow)}</div>
          )}
        </section>
      )}

      {/* ── Zone: Meals & macros ── */}
      {(mealTrackers.length > 0 || waterTrackers.length > 0) && (
        <section className="zone">
          <div className="zone-head">
            <div className="eyebrow">
              <span className="zdot food">🍽️</span> Meals &amp; macros
            </div>
            <p className="zone-help">Snap a photo or talk it out — we count the macros.</p>
          </div>
          <div className="zone-card">
            {(macroTotals.calories > 0 || targets?.calorie) && (
              <div className="macro-totals">
                <span className="mt-cal">
                  {macroTotals.calories}
                  {targets?.calorie ? ` / ${targets.calorie}` : ""} kcal
                </span>
                <span className="mt-macros">
                  <b>
                    {Math.round(macroTotals.protein_g)}
                    {targets?.protein ? `/${targets.protein}` : ""}g
                  </b>{" "}
                  P · <b>{Math.round(macroTotals.carbs_g)}g</b> C ·{" "}
                  <b>{Math.round(macroTotals.fat_g)}g</b> F
                </span>
              </div>
            )}
            {mealTrackers.map(trackerRow)}
            {waterTrackers.map(trackerRow)}
            {mealTrackers[0] && (
              <button
                type="button"
                className="zone-log-btn"
                onClick={() => openNew(mealTrackers[0])}
              >
                ＋ Log a meal
              </button>
            )}
          </div>
        </section>
      )}

      {/* ── Zone: Personal development ── */}
      {devTrackers.length > 0 && (
        <section className="zone">
          <div className="zone-head">
            <div className="eyebrow">
              <span className="zdot dev">📖</span> Personal development
            </div>
            <p className="zone-help">The habits you&apos;re building this week.</p>
          </div>
          <div className="zone-card">{devTrackers.map(trackerRow)}</div>
        </section>
      )}

      {/* ── Zone: Daily check-in ── */}
      {(weightTracker || photoTracker) && (
        <section className="zone">
          <div className="zone-head">
            <div className="eyebrow">
              <span className="zdot check">✅</span> Daily check-in
            </div>
            <p className="zone-help">Two quick ones — weight this morning, plus your progress photo.</p>
          </div>
          <div className="checkin-pair">
            {weightTracker && (
              <button
                type="button"
                className="mini-card"
                onClick={() => openNew(weightTracker)}
              >
                <span className="mini-ic">{weightTracker.emoji ?? "⚖️"}</span>
                <span className="mini-k">{weightTracker.label}</span>
                <span className={`mini-v ${doneCount(weightTracker) ? "" : "empty"}`}>
                  {sumByTracker.get(weightTracker.id) != null
                    ? `${sumByTracker.get(weightTracker.id)}${weightTracker.unit ?? ""}`
                    : "Log it"}
                </span>
                <span className="mini-cta">
                  {doneCount(weightTracker) ? "Logged ✓" : "Tap to log"}
                </span>
              </button>
            )}
            {photoTracker && (
              <button
                type="button"
                className="mini-card"
                onClick={() => openNew(photoTracker)}
              >
                <span className="mini-ic">{photoTracker.emoji ?? "📸"}</span>
                <span className="mini-k">{photoTracker.label}</span>
                <span className={`mini-v ${doneCount(photoTracker) ? "" : "empty"}`}>
                  {doneCount(photoTracker) ? "Added ✓" : "Add today's"}
                </span>
                <span className="mini-cta">Private — coach only</span>
              </button>
            )}
          </div>
        </section>
      )}

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
                  {draft.tracker.wants_macros && (
                    <label className="cf-label">
                      Photo <span className="req">required</span>
                    </label>
                  )}
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
                    className={`add-photo-btn ${
                      draft.tracker.wants_macros && draft.previews.length === 0
                        ? "needed"
                        : ""
                    }`}
                    onClick={() => fileInput.current?.click()}
                  >
                    📷{" "}
                    {draft.previews.length > 0
                      ? "Add another"
                      : draft.tracker.wants_macros
                        ? "Add a photo of your meal"
                        : "Add photo"}
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

              {/weight|scale|weigh|selfie|progress|photo/i.test(
                draft.tracker.label,
              ) && (
                <label className="share-toggle">
                  <input
                    type="checkbox"
                    checked={shareToFeed}
                    onChange={(e) => setShareToFeed(e.target.checked)}
                  />
                  <span>Share this to the group feed</span>
                </label>
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

      {/* Make-adjustments sheet */}
      {adjustOpen &&
        createPortal(
          <div className="tour-overlay" role="dialog" aria-modal="true">
            <div className="tour-card pm-card">
              <h2 className="tour-title">🎙️ Adjust today&apos;s workout</h2>

              {!proposal ? (
                <>
                  <p className="adj-sub">
                    How are you feeling, and what should change? Talk it through —
                    soreness, time, energy, equipment. We&apos;ll rework just today.
                  </p>
                  <textarea
                    className="pm-textarea"
                    rows={3}
                    value={adjustNote}
                    onChange={(e) => setAdjustNote(e.target.value)}
                    placeholder={
                      adjustWriting
                        ? "Cleaning it up…"
                        : "e.g. My knee's a little sore and I only have 40 minutes"
                    }
                  />
                  <div className="cf-dictate">
                    {adjustRec ? (
                      <button
                        type="button"
                        className="dictate-btn recording"
                        onClick={() => adjRecRef.current?.stop()}
                      >
                        ● <span>Stop</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="dictate-btn"
                        onClick={startAdjustDictation}
                        disabled={adjustWriting}
                      >
                        🎙️ <span>{adjustWriting ? "Writing…" : "Tap & talk"}</span>
                      </button>
                    )}
                  </div>

                  {adjustErr && <p className="auth-error">{adjustErr}</p>}

                  <div className="tour-nav">
                    <button type="button" className="tour-back" onClick={closeAdjust} disabled={adjustBusy}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="tour-next"
                      onClick={proposeAdjustment}
                      disabled={adjustBusy || !adjustNote.trim()}
                    >
                      {adjustBusy ? "Reworking…" : "Update my workout ›"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="adj-preview">
                    <span className="adj-badge">✦ Proposed for today</span>
                    <h3 className="adj-title">{proposal.title}</h3>
                    {proposal.detail && <p className="adj-detail">{proposal.detail}</p>}
                    {proposal.exercises.length > 0 && (
                      <ul className="wc-ex">
                        {proposal.exercises.map((e, i) => (
                          <li key={i}>
                            <span className="wc-ex-name">{exLine(e.name, e.sets, e.reps)}</span>
                            {e.cue && <span className="wc-cue">{e.cue}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                    {proposal.reason && <p className="adj-reason">✦ {proposal.reason}</p>}
                  </div>

                  {adjustErr && <p className="auth-error">{adjustErr}</p>}

                  <div className="tour-nav">
                    <button
                      type="button"
                      className="tour-back"
                      onClick={() => setProposal(null)}
                      disabled={adjustBusy}
                    >
                      ‹ Talk again
                    </button>
                    <button
                      type="button"
                      className="tour-next"
                      onClick={applyAdjustment}
                      disabled={adjustBusy}
                    >
                      {adjustBusy ? "Applying…" : "Apply to today ›"}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="cf-cancel-link"
                    onClick={closeAdjust}
                    disabled={adjustBusy}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </main>
  );
}
