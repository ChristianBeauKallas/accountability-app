"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  CoachingIntake,
  CoachingPlan,
  PlanWorkout,
  PlanExercise,
} from "@/lib/types";

const DOW = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function exToText(ex: PlanExercise[] | null): string {
  if (!ex || ex.length === 0) return "";
  return ex
    .map(
      (e) =>
        `${e.name} — ${e.sets ?? ""}x${e.reps ?? ""}${e.cue ? ` — ${e.cue}` : ""}`,
    )
    .join("\n");
}
function textToEx(text: string): PlanExercise[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("—").map((p) => p.trim());
      const name = parts[0] ?? line;
      const scheme = parts[1] ?? "";
      const cue = parts[2] ?? "";
      const m = scheme.match(/(\d+)\s*[x×]\s*([\w-]+)/);
      return {
        name,
        sets: m ? Number(m[1]) : undefined,
        reps: m ? m[2] : undefined,
        cue: cue || undefined,
      };
    });
}

export default function CoachPlanEditor({
  clientId,
  intake,
  plan,
  workouts,
}: {
  clientId: string;
  intake: CoachingIntake | null;
  plan: CoachingPlan | null;
  workouts: PlanWorkout[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Editable plan state.
  const [summary, setSummary] = useState(plan?.summary ?? "");
  const [dietNotes, setDietNotes] = useState(plan?.diet_notes ?? "");
  const [cal, setCal] = useState(plan?.calorie_target?.toString() ?? "");
  const [protein, setProtein] = useState(plan?.protein_target?.toString() ?? "");
  const [carbs, setCarbs] = useState(plan?.carbs_target?.toString() ?? "");
  const [fat, setFat] = useState(plan?.fat_target?.toString() ?? "");
  const [water, setWater] = useState(plan?.water_target?.toString() ?? "");
  const [wo, setWo] = useState(
    workouts.map((w) => ({
      id: w.id,
      weekday: w.weekday,
      title: w.title,
      kind: w.kind,
      text: exToText(w.exercises),
    })),
  );

  async function generate() {
    if (!intake) return;
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch("/api/generate-plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ intakeId: intake.id }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr(d.error ?? "Generation failed.");
      return;
    }
    router.refresh();
  }

  async function saveDraft(): Promise<boolean> {
    if (!plan) return false;
    const supabase = createClient();
    const { error: pErr } = await supabase
      .from("coaching_plans")
      .update({
        summary: summary.trim() || null,
        diet_notes: dietNotes.trim() || null,
        calorie_target: cal ? Number(cal) : null,
        protein_target: protein ? Number(protein) : null,
        carbs_target: carbs ? Number(carbs) : null,
        fat_target: fat ? Number(fat) : null,
        water_target: water ? Number(water) : null,
      })
      .eq("id", plan.id);
    if (pErr) {
      setErr(pErr.message);
      return false;
    }
    for (const w of wo) {
      const { error } = await supabase
        .from("coaching_plan_workouts")
        .update({ title: w.title, exercises: textToEx(w.text) })
        .eq("id", w.id);
      if (error) {
        setErr(error.message);
        return false;
      }
    }
    return true;
  }

  async function approve() {
    if (!plan) return;
    setBusy(true);
    setErr(null);
    const ok = await saveDraft();
    if (!ok) {
      setBusy(false);
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.rpc("activate_plan", { p_plan: plan.id });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    router.push(`/coach/${clientId}`);
    router.refresh();
  }

  async function justSave() {
    setBusy(true);
    setErr(null);
    const ok = await saveDraft();
    setBusy(false);
    if (ok) router.refresh();
  }

  // ---- No plan yet: show intake + Generate ----
  if (!plan) {
    if (!intake) {
      return (
        <div className="notice">
          No intake submitted yet. Ask your client to fill out their plan intake.
        </div>
      );
    }
    return (
      <>
        <section className="settings-card">
          <h2 className="settings-title">Intake</h2>
          <div className="intake-summary">
            <p>
              <b>Goal:</b> {intake.goals ?? "—"}
            </p>
            <p>
              <b>Weight:</b> {intake.current_weight ?? "?"} → {intake.goal_weight ?? "?"} lb ·{" "}
              <b>Build:</b> {intake.build ?? "?"}
            </p>
            <p>
              <b>Activity/Diet:</b> {intake.activity_level ?? "?"}/{intake.diet_level ?? "?"} ·{" "}
              <b>Diet:</b> {intake.diet_type ?? "none"} · <b>Maint:</b>{" "}
              {intake.maintenance_calories ?? "estimate"} cal
            </p>
            <p>
              <b>Trains:</b>{" "}
              {(intake.train_days ?? []).map((d) => DOW[d]).join(", ") || "flexible"} ·{" "}
              <b>Types:</b> {(intake.workout_types ?? []).join(", ") || "any"}
            </p>
            <p>
              <b>Habits:</b>{" "}
              {(intake.habits ?? []).map((h) => `${h.name} (${h.cadence})`).join(", ") || "—"}
            </p>
          </div>
        </section>
        {err && <p className="auth-error">{err}</p>}
        <button className="btn-primary" onClick={generate} disabled={busy}>
          {busy ? "Generating…" : "✨ Generate Week 1"}
        </button>
      </>
    );
  }

  // ---- Draft/active plan: edit + approve ----
  return (
    <>
      <div className="plan-status">
        Week {plan.week_number} ·{" "}
        {plan.status === "active" ? "Active" : "Draft — edit, then assign"}
      </div>

      <section className="settings-card">
        <h2 className="settings-title">Daily targets</h2>
        <div className="target-grid">
          <label>
            Calories
            <input type="number" value={cal} onChange={(e) => setCal(e.target.value)} />
          </label>
          <label>
            Protein
            <input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} />
          </label>
          <label>
            Carbs
            <input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
          </label>
          <label>
            Fat
            <input type="number" value={fat} onChange={(e) => setFat(e.target.value)} />
          </label>
          <label>
            Water (oz)
            <input type="number" value={water} onChange={(e) => setWater(e.target.value)} />
          </label>
        </div>
        <label className="cf-label">Diet notes</label>
        <textarea className="pm-textarea" rows={2} value={dietNotes} onChange={(e) => setDietNotes(e.target.value)} />
        <label className="cf-label">Plan summary (client sees this)</label>
        <textarea className="pm-textarea" rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </section>

      <section className="settings-card">
        <h2 className="settings-title">Weekly workouts</h2>
        <p className="settings-hint">
          Exercises: one per line — <code>Name — 4x8 — cue</code>
        </p>
        {wo.map((w, i) => (
          <div className="wo-edit" key={w.id}>
            <div className="wo-head">
              <span className="wo-dow">{DOW[w.weekday]}</span>
              <input
                className="wo-title"
                value={w.title}
                onChange={(e) =>
                  setWo(wo.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                }
              />
            </div>
            {w.kind !== "rest" && (
              <textarea
                className="pm-textarea"
                rows={4}
                value={w.text}
                placeholder="Bench Press — 4x8 — brace and control"
                onChange={(e) =>
                  setWo(wo.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))
                }
              />
            )}
          </div>
        ))}
      </section>

      {err && <p className="auth-error">{err}</p>}
      <div className="plan-actions">
        <button className="tour-back" onClick={justSave} disabled={busy}>
          Save draft
        </button>
        <button className="btn-primary" onClick={approve} disabled={busy}>
          {busy ? "Working…" : plan.status === "active" ? "Re-assign" : "Approve & assign ›"}
        </button>
      </div>
      <button className="link-btn plan-regen" onClick={generate} disabled={busy}>
        ✨ Regenerate from intake
      </button>
    </>
  );
}
