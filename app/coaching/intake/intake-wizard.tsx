"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { transcribe, polish } from "@/lib/ai";
import type { IntakeHabit } from "@/lib/types";

const DAYS = [
  { n: 1, l: "M" },
  { n: 2, l: "T" },
  { n: 3, l: "W" },
  { n: 4, l: "T" },
  { n: 5, l: "F" },
  { n: 6, l: "S" },
  { n: 7, l: "S" },
];
const BUILDS = ["Lean", "Average", "Athletic", "Athletically heavy", "Heavy"];
const DIET_TYPES = ["None", "High-protein", "Keto", "Carnivore", "IF", "Vegan", "Other"];
const WORKOUT_TYPES = [
  "Lifting",
  "Running",
  "Strength",
  "HIIT",
  "Cycling",
  "Walking",
  "Mobility",
  "Sports",
];
const CADENCES = ["Daily", "2×/week", "3×/week", "4×/week", "5×/week", "Weekdays", "Weekends"];
const ANCHORS = {
  activity: ["Not active at all", "Training every day"],
  diet: ["No real discipline", "Fully dialed in"],
};

function pickAudioMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const c = ["audio/webm", "audio/mp4", "audio/ogg"];
  return c.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export default function IntakeWizard({
  relationshipId,
  userId,
}: {
  relationshipId: string;
  userId: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [goals, setGoals] = useState("");
  const [recording, setRecording] = useState(false);
  const [dictating, setDictating] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const [weight, setWeight] = useState("");
  const [goalWeight, setGoalWeight] = useState("");
  const [build, setBuild] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [activity, setActivity] = useState<number | null>(null);
  const [dietLevel, setDietLevel] = useState<number | null>(null);
  const [dietType, setDietType] = useState("");
  const [customDiet, setCustomDiet] = useState("");
  const [maintenance, setMaintenance] = useState("");
  const [trainDays, setTrainDays] = useState<number[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [customType, setCustomType] = useState("");
  const [habits, setHabits] = useState<IntakeHabit[]>([]);
  const [habitName, setHabitName] = useState("");
  const [habitCadence, setHabitCadence] = useState("Daily");

  const STEPS = 8;

  async function startDictation() {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickAudioMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data);
      rec.onstop = async () => {
        const type = chunks.current[0]?.type || mime || "audio/mp4";
        const blob = new Blob(chunks.current, { type });
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        if (blob.size === 0) return;
        setDictating(true);
        try {
          const raw = await transcribe(blob);
          let clean = raw;
          try {
            clean = await polish(raw, "Fitness goals for a coaching intake");
          } catch {
            /* keep raw */
          }
          setGoals((g) => (g ? `${g} ${clean}` : clean));
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Couldn't transcribe.");
        }
        setDictating(false);
      };
      recRef.current = rec;
      rec.start(500);
      setRecording(true);
    } catch {
      setErr("Mic access denied — you can type instead.");
    }
  }

  function toggle<T>(arr: T[], v: T, set: (a: T[]) => void) {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }
  function addHabit() {
    const n = habitName.trim();
    if (!n) return;
    setHabits((h) => [...h, { name: n, cadence: habitCadence }]);
    setHabitName("");
  }

  async function submit() {
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const allTypes = [...types, ...(customType.trim() ? [customType.trim()] : [])];
    const dietValue =
      dietType === "Other" ? customDiet.trim() || "Other" : dietType || null;
    const { error } = await supabase.from("coaching_intakes").insert({
      relationship_id: relationshipId,
      client_id: userId,
      goals: goals.trim() || null,
      current_weight: weight ? Number(weight) : null,
      goal_weight: goalWeight ? Number(goalWeight) : null,
      build: build || null,
      height: height.trim() || null,
      age: age ? Number(age) : null,
      activity_level: activity,
      diet_level: dietLevel,
      diet_type: dietValue,
      maintenance_calories: maintenance ? Number(maintenance) : null,
      train_days: trainDays.length ? trainDays : null,
      workout_types: allTypes.length ? allTypes : null,
      habits: habits.length ? habits : null,
      status: "submitted",
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    router.push("/coaching");
    router.refresh();
  }

  const canNext =
    step === 0
      ? goals.trim().length > 0
      : step === 4
        ? true
        : step === 5
          ? trainDays.length > 0
          : true;

  return (
    <main className="board intake">
      <header className="board-head">
        <div className="board-head-top">
          <div>
            <h1>Let&apos;s build your plan</h1>
            <p className="subtitle">
              Step {step + 1} of {STEPS}
            </p>
          </div>
        </div>
      </header>

      <div className="intake-dots">
        {Array.from({ length: STEPS }).map((_, i) => (
          <span key={i} className={`idot ${i <= step ? "on" : ""}`} />
        ))}
      </div>

      <section className="intake-card">
        {step === 0 && (
          <>
            <p className="q">What are you working toward?</p>
            <p className="q-sub">
              Tell me everything — the more detail, the more specific your plan.
            </p>
            <div className="intake-mic-row">
              {recording ? (
                <button className="dictate-btn recording" onClick={() => recRef.current?.stop()}>
                  ● <span>Stop</span>
                </button>
              ) : (
                <button className="dictate-btn" onClick={startDictation} disabled={dictating}>
                  🎙️ <span>{dictating ? "Writing…" : "Tap & talk"}</span>
                </button>
              )}
            </div>
            <textarea
              className="cf-input"
              rows={5}
              value={goals}
              placeholder={dictating ? "Cleaning it up…" : "…or type it here"}
              onChange={(e) => setGoals(e.target.value)}
            />
          </>
        )}

        {step === 1 && (
          <>
            <p className="q">Where are you at?</p>
            <label className="cf-label">Current weight → goal (lb)</label>
            <div className="intake-two">
              <input className="cf-input" type="number" inputMode="decimal" value={weight} placeholder="205" onChange={(e) => setWeight(e.target.value)} />
              <span className="intake-arrow">→</span>
              <input className="cf-input" type="number" inputMode="decimal" value={goalWeight} placeholder="185" onChange={(e) => setGoalWeight(e.target.value)} />
            </div>
            <label className="cf-label">Your build right now</label>
            <div className="chips">
              {BUILDS.map((b) => (
                <button key={b} className={`chip ${build === b ? "on" : ""}`} onClick={() => setBuild(b)}>
                  {b}
                </button>
              ))}
            </div>
            <div className="intake-two" style={{ marginTop: "0.7rem" }}>
              <input className="cf-input" value={height} placeholder={`Height e.g. 6'1"`} onChange={(e) => setHeight(e.target.value)} />
              <input className="cf-input" type="number" inputMode="numeric" value={age} placeholder="Age" onChange={(e) => setAge(e.target.value)} />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="q">How active are you right now?</p>
            <Scale value={activity} onPick={setActivity} anchors={ANCHORS.activity} />
          </>
        )}

        {step === 3 && (
          <>
            <p className="q">How dialed-in is your diet?</p>
            <Scale value={dietLevel} onPick={setDietLevel} anchors={ANCHORS.diet} />
          </>
        )}

        {step === 4 && (
          <>
            <p className="q">Your nutrition</p>
            <label className="cf-label">What kind of diet do you follow?</label>
            <div className="chips">
              {DIET_TYPES.map((d) => (
                <button key={d} className={`chip ${dietType === d ? "on" : ""}`} onClick={() => setDietType(d)}>
                  {d}
                </button>
              ))}
            </div>
            {dietType === "Other" && (
              <input
                className="cf-input"
                style={{ marginBottom: "0.7rem" }}
                value={customDiet}
                placeholder="Tell us how you eat — e.g. pescatarian, low-FODMAP…"
                onChange={(e) => setCustomDiet(e.target.value)}
              />
            )}
            <label className="cf-label">Your maintenance calories</label>
            <input className="cf-input" type="number" inputMode="numeric" value={maintenance} placeholder="e.g. 2,600" onChange={(e) => setMaintenance(e.target.value)} />
            <p className="q-sub">What you eat to hold weight — we build your target around this. Not sure? Leave it blank and we&apos;ll estimate.</p>
          </>
        )}

        {step === 5 && (
          <>
            <p className="q">Which days can you train?</p>
            <div className="days">
              {DAYS.map((d) => (
                <button key={d.n} className={`dayb ${trainDays.includes(d.n) ? "on" : ""}`} onClick={() => toggle(trainDays, d.n, setTrainDays)}>
                  {d.l}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 6 && (
          <>
            <p className="q">What kind of workouts?</p>
            <div className="chips">
              {WORKOUT_TYPES.map((t) => (
                <button key={t} className={`chip ${types.includes(t) ? "on" : ""}`} onClick={() => toggle(types, t, setTypes)}>
                  {t}
                </button>
              ))}
            </div>
            <input className="cf-input" style={{ marginTop: "0.7rem" }} value={customType} placeholder="Add another…" onChange={(e) => setCustomType(e.target.value)} />
          </>
        )}

        {step === 7 && (
          <>
            <p className="q">What else do you want to be accountable to?</p>
            {habits.map((h, i) => (
              <div className="actrow" key={i}>
                <span className="nm">{h.name}</span>
                <span className="cad">{h.cadence}</span>
                <button className="actx" onClick={() => setHabits(habits.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
            <div className="habit-add">
              <input className="cf-input" value={habitName} placeholder="e.g. Read 20 min" onChange={(e) => setHabitName(e.target.value)} />
              <select className="coach-select" value={habitCadence} onChange={(e) => setHabitCadence(e.target.value)}>
                {CADENCES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <button className="coach-add-btn" onClick={addHabit}>Add</button>
            </div>
          </>
        )}

        {err && <p className="auth-error">{err}</p>}

        <div className="intake-nav">
          {step > 0 ? (
            <button className="tour-back" onClick={() => setStep(step - 1)} disabled={busy}>
              Back
            </button>
          ) : (
            <span />
          )}
          {step < STEPS - 1 ? (
            <button className="tour-next" onClick={() => setStep(step + 1)} disabled={!canNext}>
              Next ›
            </button>
          ) : (
            <button className="tour-next" onClick={submit} disabled={busy}>
              {busy ? "Sending…" : "Send to coach ›"}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

function Scale({
  value,
  onPick,
  anchors,
}: {
  value: number | null;
  onPick: (n: number) => void;
  anchors: string[];
}) {
  return (
    <>
      <div className="scale">
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <button key={n} className={`scaleb ${value === n ? "on" : ""}`} onClick={() => onPick(n)}>
            {n}
          </button>
        ))}
      </div>
      <div className="anchor">
        <span>{anchors[0]}</span>
        <span>{anchors[1]}</span>
      </div>
    </>
  );
}
