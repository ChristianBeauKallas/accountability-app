"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { syncPlanRecap } from "@/lib/plan-recap";
import type { PlanExercise } from "@/lib/types";

type SetRow = { weight: string; reps: string };
type ExState = { name: string; scheme: string; cue: string; sets: SetRow[] };

function repNum(r?: string): string {
  const m = (r || "").match(/\d+/);
  return m ? m[0] : "";
}

export default function WorkoutLogger({
  relationshipId,
  userId,
  day,
  title,
  planWorkoutId,
  exercises,
  existingLogId,
  existingEffort,
  existingSets,
  lastByExercise,
}: {
  relationshipId: string;
  userId: string;
  day: string;
  title: string;
  planWorkoutId: string | null;
  exercises: PlanExercise[];
  existingLogId: string | null;
  existingEffort: string | null;
  existingSets: {
    exercise_name: string;
    set_index: number;
    weight: number | null;
    reps: number | null;
  }[];
  lastByExercise: Record<string, { weight: number | null; reps: number | null }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [effort, setEffort] = useState<string | null>(existingEffort);
  const [newExercise, setNewExercise] = useState("");

  const [state, setState] = useState<ExState[]>(() => build());

  function build(): ExState[] {
    // Group any already-logged sets by exercise.
    const loggedBy = new Map<string, SetRow[]>();
    for (const s of existingSets) {
      const arr = loggedBy.get(s.exercise_name) ?? [];
      arr[s.set_index - 1] = {
        weight: s.weight != null ? String(s.weight) : "",
        reps: s.reps != null ? String(s.reps) : "",
      };
      loggedBy.set(s.exercise_name, arr);
    }

    const names = new Set<string>();
    const out: ExState[] = [];
    for (const e of exercises) {
      names.add(e.name);
      const logged = loggedBy.get(e.name);
      const last = lastByExercise[e.name];
      let sets: SetRow[];
      if (logged && logged.length) {
        sets = logged.map((r) => r ?? { weight: "", reps: "" });
      } else {
        const count = e.sets && e.sets > 0 ? e.sets : 3;
        sets = Array.from({ length: count }, () => ({
          weight: last?.weight != null ? String(last.weight) : "",
          reps: repNum(e.reps) || (last?.reps != null ? String(last.reps) : ""),
        }));
      }
      out.push({
        name: e.name,
        scheme:
          e.sets && e.sets > 1
            ? `${e.sets}×${e.reps ?? ""}`
            : (e.reps ?? "").trim(),
        cue: e.cue ?? "",
        sets,
      });
    }
    // Any freeform exercises previously logged that aren't in the prescription.
    for (const [name, rows] of loggedBy) {
      if (names.has(name)) continue;
      out.push({ name, scheme: "", cue: "", sets: rows.map((r) => r ?? { weight: "", reps: "" }) });
    }
    return out;
  }

  function setCell(ei: number, si: number, key: keyof SetRow, val: string) {
    setState((st) =>
      st.map((ex, i) =>
        i === ei
          ? { ...ex, sets: ex.sets.map((s, j) => (j === si ? { ...s, [key]: val } : s)) }
          : ex,
      ),
    );
  }
  function addSet(ei: number) {
    setState((st) =>
      st.map((ex, i) =>
        i === ei ? { ...ex, sets: [...ex.sets, { weight: "", reps: "" }] } : ex,
      ),
    );
  }
  function removeSet(ei: number, si: number) {
    setState((st) =>
      st.map((ex, i) =>
        i === ei ? { ...ex, sets: ex.sets.filter((_, j) => j !== si) } : ex,
      ),
    );
  }
  function addExercise() {
    const n = newExercise.trim();
    if (!n) return;
    setState((st) => [...st, { name: n, scheme: "", cue: "", sets: [{ weight: "", reps: "" }] }]);
    setNewExercise("");
  }

  async function save() {
    setBusy(true);
    setErr(null);
    const supabase = createClient();

    let logId = existingLogId;
    if (logId) {
      const { error } = await supabase
        .from("coaching_workout_logs")
        .update({ effort, title, updated_at: new Date().toISOString() })
        .eq("id", logId);
      if (error) return fail(error.message);
    } else {
      const { data, error } = await supabase
        .from("coaching_workout_logs")
        .insert({
          relationship_id: relationshipId,
          client_id: userId,
          plan_workout_id: planWorkoutId,
          title,
          day,
          effort,
        })
        .select("id")
        .single();
      if (error || !data) return fail(error?.message ?? "Couldn't save.");
      logId = data.id as string;
    }

    // Replace the sets.
    await supabase.from("coaching_exercise_sets").delete().eq("workout_log_id", logId);
    const rows: {
      workout_log_id: string;
      exercise_name: string;
      set_index: number;
      weight: number | null;
      reps: number | null;
    }[] = [];
    for (const ex of state) {
      ex.sets.forEach((s, i) => {
        if (s.weight.trim() || s.reps.trim()) {
          rows.push({
            workout_log_id: logId as string,
            exercise_name: ex.name,
            set_index: i + 1,
            weight: s.weight.trim() ? Number(s.weight) : null,
            reps: s.reps.trim() ? Number(s.reps) : null,
          });
        }
      });
    }
    if (rows.length > 0) {
      const { error } = await supabase.from("coaching_exercise_sets").insert(rows);
      if (error) return fail(error.message);
    }

    // Mark the "Workout" tracker done today so it counts toward adherence.
    const { data: wt } = await supabase
      .from("coaching_trackers")
      .select("id")
      .eq("relationship_id", relationshipId)
      .eq("label", "Workout")
      .eq("active", true)
      .maybeSingle();
    if (wt) {
      const startISO = new Date(day + "T00:00:00").toISOString();
      const endISO = new Date(new Date(day + "T00:00:00").getTime() + 86400000).toISOString();
      const { data: ex } = await supabase
        .from("coaching_entries")
        .select("id")
        .eq("tracker_id", wt.id)
        .gte("happened_at", startISO)
        .lt("happened_at", endISO)
        .limit(1)
        .maybeSingle();
      const detail = `${title}${effort ? ` · felt ${effort}` : ""}`;
      if (ex) {
        await supabase.from("coaching_entries").update({ detail }).eq("id", ex.id);
      } else {
        await supabase.from("coaching_entries").insert({
          relationship_id: relationshipId,
          client_id: userId,
          tracker_id: wt.id,
          // Anchor to the logged day (noon) so backdated workouts land right.
          happened_at: new Date(day + "T12:00:00").toISOString(),
          detail,
        });
      }
    }

    setBusy(false);
    void syncPlanRecap(day);
    router.push(`/coaching?d=${day}`);
    router.refresh();

    function fail(msg: string) {
      setErr(msg);
      setBusy(false);
    }
  }

  return (
    <>
      <div className="wl-banner">
        📋 Log your workout — enter the weight &amp; reps you hit for each set,
        then save.
      </div>
      {state.map((ex, ei) => {
        const last = lastByExercise[ex.name];
        return (
          <section className="wl-ex" key={ei}>
            <div className="wl-ex-head">
              <span className="wl-ex-name">{ex.name}</span>
              {ex.scheme && <span className="wl-ex-scheme">{ex.scheme}</span>}
            </div>
            {ex.cue && <p className="wl-cue">{ex.cue}</p>}
            {last?.weight != null && (
              <p className="wl-last">
                Last time: {last.weight}
                {last.reps != null ? ` × ${last.reps}` : ""}
              </p>
            )}
            <div className="wl-sets">
              {ex.sets.map((s, si) => (
                <div className="wl-set" key={si}>
                  <span className="wl-sn">Set {si + 1}</span>
                  <label className="wl-field">
                    <input
                      type="number"
                      inputMode="decimal"
                      className="wl-in"
                      placeholder="0"
                      value={s.weight}
                      onChange={(e) => setCell(ei, si, "weight", e.target.value)}
                    />
                    <span className="wl-unit">lb</span>
                  </label>
                  <span className="wl-x">×</span>
                  <label className="wl-field">
                    <input
                      type="number"
                      inputMode="numeric"
                      className="wl-in"
                      placeholder="0"
                      value={s.reps}
                      onChange={(e) => setCell(ei, si, "reps", e.target.value)}
                    />
                    <span className="wl-unit">reps</span>
                  </label>
                  <button className="wl-rm" onClick={() => removeSet(ei, si)} aria-label="Remove set">
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button className="wl-addset" onClick={() => addSet(ei)}>
              + set
            </button>
          </section>
        );
      })}

      <div className="wl-addex">
        <input
          className="cf-input"
          value={newExercise}
          placeholder="Add an exercise…"
          onChange={(e) => setNewExercise(e.target.value)}
        />
        <button className="coach-add-btn" onClick={addExercise}>
          Add
        </button>
      </div>

      <section className="wl-effort">
        <span className="cf-label">How&apos;d it feel?</span>
        <div className="eopts">
          {["easy", "right", "hard"].map((e) => (
            <button
              key={e}
              className={`eopt ${effort === e ? "on" : ""}`}
              onClick={() => setEffort(e)}
            >
              {e[0].toUpperCase() + e.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {err && <p className="auth-error">{err}</p>}
      <button className="btn-primary wl-save" onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save workout ›"}
      </button>
    </>
  );
}
