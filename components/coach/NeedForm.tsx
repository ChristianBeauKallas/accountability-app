"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { HeaderActions } from "@/components/HeaderActions";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { StepProgress } from "@/components/ui/ProgressBar";
import { BaseballIcon } from "@/components/ui/BaseballIcon";
import { POSITIONS, PITCHES, isPitcher, isCatcher } from "@/lib/constants";
import type { Need } from "@/lib/types";

// A suggested, editable title for each position the coach can pick.
const POSITION_TITLE: Record<string, string> = {
  C: "Catcher wanted",
  "1B": "First baseman wanted",
  "2B": "Second baseman wanted",
  "3B": "Third baseman wanted",
  SS: "Shortstop wanted",
  LF: "Left fielder wanted",
  CF: "Center fielder wanted",
  RF: "Right fielder wanted",
  OF: "Outfielder wanted",
  RHP: "RHP wanted",
  LHP: "LHP wanted",
  DH: "Bat / DH wanted",
  UTIL: "Utility player wanted",
};

const PITCH_SET = new Set<string>(PITCHES as readonly string[]);

// The wizard advances through these. "generating" is a full-screen spinner
// shown while the AI drafts the post, then it lands on "review".
type Phase = "position" | "metrics" | "qualify" | "generating" | "review";
const STEP_LABELS = ["Position", "Details", "Who qualifies", "Review"];

export function NeedForm({
  programId,
  need,
  firstNeed = false,
}: {
  programId: string;
  need?: Need;
  firstNeed?: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const editing = !!need;

  // Editing an existing need drops straight into review (everything's filled);
  // a new need starts at position and walks forward.
  const [phase, setPhase] = useState<Phase>(editing ? "review" : "position");

  // A need is one position at a time.
  const [position, setPosition] = useState<string>(need?.positions?.[0] ?? "");
  const [title, setTitle] = useState(need?.title ?? "");
  // Once the coach edits the title we stop auto-suggesting it.
  const [titleEdited, setTitleEdited] = useState(!!need?.title);
  const [gradMin, setGradMin] = useState(need?.grad_year_min?.toString() ?? "");
  const [gradMax, setGradMax] = useState(need?.grad_year_max?.toString() ?? "");
  const [acceptsTransfer, setAcceptsTransfer] = useState(
    need?.accepts_transfer ?? false
  );
  const [minGpa, setMinGpa] = useState(need?.min_gpa?.toString() ?? "");
  // "Pitches you're looking for" live in must_have (shown to players as
  // "what they're looking for"); keep them separate in the UI from free-text
  // keywords by splitting on the known pitch names.
  const [pitchesWanted, setPitchesWanted] = useState<string[]>(
    (need?.must_have ?? []).filter((m) => PITCH_SET.has(m))
  );
  const [mustHave, setMustHave] = useState(
    (need?.must_have ?? []).filter((m) => !PITCH_SET.has(m)).join(", ")
  );
  const [minExit, setMinExit] = useState(need?.min_exit_velo?.toString() ?? "");
  const [minFb, setMinFb] = useState(need?.min_fastball_velo?.toString() ?? "");
  const [minSixty, setMinSixty] = useState(need?.min_sixty?.toString() ?? "");
  const [minPop, setMinPop] = useState(need?.min_pop_time?.toString() ?? "");
  const [description, setDescription] = useState(need?.description ?? "");
  const [genNote, setGenNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const num = (v: string) => (v === "" ? null : Number(v));
  const valid = !!title.trim() && !!position;

  const pitcher = isPitcher(position);
  const catcher = isCatcher(position);
  const hitter = !!position && !pitcher; // catcher counts as a hitter here

  function pickPosition(pos: string) {
    setPosition(pos);
    // Auto-suggest the title until the coach has customized it.
    if (!titleEdited || title.trim() === "") {
      setTitle(POSITION_TITLE[pos] ?? "");
      setTitleEdited(false);
    }
    // Drop metric values that don't apply to the new position's bucket.
    if (isPitcher(pos)) {
      setMinExit("");
      setMinSixty("");
      setMinPop("");
    } else {
      setMinFb("");
      setPitchesWanted([]);
      if (!isCatcher(pos)) setMinPop("");
    }
  }

  function togglePitch(p: string) {
    setPitchesWanted((cur) =>
      cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]
    );
  }

  // Ask the AI to write a headline + short description from what's entered.
  // Falls back gracefully — the coach can always type their own on review.
  async function generate() {
    if (!position) return;
    setGenNote("");
    try {
      const keywords = mustHave
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch("/api/ai/need", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          position,
          gradMin,
          gradMax,
          acceptsTransfer,
          minGpa,
          pitches: pitcher ? pitchesWanted : [],
          mustHave: keywords,
          minExit,
          minFb,
          minSixty,
          minPop,
        }),
      });
      if (res.status === 503) {
        setGenNote("AI isn't set up yet — write your own below.");
        return;
      }
      if (!res.ok) {
        setGenNote("Couldn't generate — try again, or write your own.");
        return;
      }
      const data = (await res.json()) as {
        title?: string;
        description?: string;
      };
      if (data.title) {
        setTitle(data.title);
        setTitleEdited(true);
      }
      if (data.description != null) setDescription(data.description);
      setGenNote("Generated ✨ — tweak anything you want.");
    } catch {
      setGenNote("Couldn't generate — try again, or write your own.");
    }
  }

  // Qualify → "Generate post": show the spinner, draft, then land on review.
  async function generateAndReview() {
    setPhase("generating");
    await generate();
    setPhase("review");
  }

  // Review → "Regenerate": redraft in place without leaving review.
  const [regenerating, setRegenerating] = useState(false);
  async function regenerate() {
    if (regenerating) return;
    setRegenerating(true);
    await generate();
    setRegenerating(false);
  }

  async function submit() {
    setError("");
    if (!valid) {
      setError("Pick a position and add a headline.");
      return;
    }
    setSaving(true);

    // Combine pitcher pitch chips with free-text keywords, de-duplicated.
    const keywords = mustHave
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const mustHaveAll = Array.from(
      new Set([...(pitcher ? pitchesWanted : []), ...keywords])
    );

    const payload = {
      program_id: programId,
      title: title.trim(),
      positions: [position],
      grad_year_min: num(gradMin),
      grad_year_max: num(gradMax),
      accepts_transfer: acceptsTransfer,
      min_gpa: minGpa === "" ? 0 : Number(minGpa),
      must_have: mustHaveAll,
      // Only keep the thresholds that apply to this position's bucket.
      min_exit_velo: hitter ? num(minExit) : null,
      min_fastball_velo: pitcher ? num(minFb) : null,
      min_sixty: hitter ? num(minSixty) : null,
      min_pop_time: catcher ? num(minPop) : null,
      description: description.trim() || null,
    };

    const { error: err } = editing
      ? await supabase.from("needs").update(payload).eq("id", need!.id)
      : await supabase.from("needs").insert(payload);

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    // After the very first need, drop into the inbox.
    router.push(firstNeed ? "/inbox" : "/needs");
    router.refresh();
  }

  const years = (() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => now + i - 2);
  })();

  // Walk back a phase; from the first step, leave the form entirely.
  function goBack() {
    if (phase === "metrics") setPhase("position");
    else if (phase === "qualify") setPhase("metrics");
    else if (phase === "review") setPhase(editing ? "position" : "qualify");
    else router.push(firstNeed ? "/inbox" : "/needs");
  }

  // ---- Full-screen spinner while the AI drafts the post. ----
  if (phase === "generating") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="animate-spin text-accent" style={{ animationDuration: "1.3s" }}>
          <BaseballIcon size={56} strokeWidth={2} aria-hidden />
        </div>
        <p className="font-display text-xl font-semibold text-ink">
          Drafting your post…
        </p>
      </main>
    );
  }

  const stepNum =
    phase === "position" ? 1 : phase === "metrics" ? 2 : phase === "qualify" ? 3 : 4;

  // Metric prompt copy per bucket.
  const metricHeading = pitcher
    ? "What you want on the mound"
    : catcher
      ? "What you want behind the plate"
      : "Set the bar at the plate";

  return (
    <main
      className="flex min-h-dvh flex-col px-5 pt-12"
      style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted"
        >
          <ArrowLeft size={16} strokeWidth={2} aria-hidden />
          Back
        </button>
        {firstNeed ? (
          <Link href="/inbox" className="text-sm font-semibold text-muted">
            Skip for now
          </Link>
        ) : (
          <HeaderActions />
        )}
      </div>

      {/* Progress */}
      <StepProgress total={4} current={stepNum} className="mt-5" />
      <p className="mt-2 text-[11px] font-bold uppercase tracking-eyebrow text-muted-2">
        Step {stepNum} of 4 · {STEP_LABELS[stepNum - 1]}
      </p>

      {/* ---- Step 1: Position ---- */}
      {phase === "position" && (
        <div className="mt-5 flex flex-1 flex-col">
          <h1 className="text-2xl font-display font-bold tracking-tight">
            {firstNeed ? "Post your first need" : "What spot do you need?"}
          </h1>
          <p className="mt-1 text-[15px] text-body-2">
            Pick one position — post another for each spot you&rsquo;re recruiting.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {POSITIONS.map((pos) => {
              const active = position === pos;
              return (
                <button
                  key={pos}
                  type="button"
                  onClick={() => pickPosition(pos)}
                  className={cn(
                    "h-11 rounded-pill px-4 text-sm font-semibold transition-colors",
                    active
                      ? "bg-accent text-surface"
                      : "bg-chip text-body-2 hover:bg-accent-soft"
                  )}
                >
                  {pos}
                </button>
              );
            })}
          </div>

          <div className="mt-auto pt-8">
            <Button
              size="lg"
              full
              onClick={() => setPhase("metrics")}
              disabled={!position}
            >
              Continue
              <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
            </Button>
          </div>
        </div>
      )}

      {/* ---- Step 2: Position-specific details ---- */}
      {phase === "metrics" && (
        <div className="mt-5 flex flex-1 flex-col">
          <h1 className="text-2xl font-display font-bold tracking-tight">
            {metricHeading}
          </h1>
          <p className="mt-1 text-[15px] text-body-2">
            Set the bar so only players who clear it see this. All optional.
          </p>

          <div className="mt-6 space-y-5">
            {pitcher && (
              <div>
                <p className="mb-2 text-sm font-medium text-body-2">
                  Pitches you&rsquo;re looking for
                </p>
                <div className="flex flex-wrap gap-2">
                  {PITCHES.map((p) => {
                    const active = pitchesWanted.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePitch(p)}
                        className={cn(
                          "h-9 rounded-pill px-3.5 text-sm font-semibold transition-colors",
                          active
                            ? "bg-accent text-surface"
                            : "bg-chip text-body-2 hover:bg-accent-soft"
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {pitcher && (
                <Field label="Fastball velo ≥ (mph)" htmlFor="fb">
                  <Input
                    id="fb"
                    type="number"
                    inputMode="numeric"
                    placeholder="85"
                    value={minFb}
                    onChange={(e) => setMinFb(e.target.value)}
                  />
                </Field>
              )}
              {hitter && (
                <>
                  <Field label="Exit velo ≥ (mph)" htmlFor="ev">
                    <Input
                      id="ev"
                      type="number"
                      inputMode="numeric"
                      placeholder="92"
                      value={minExit}
                      onChange={(e) => setMinExit(e.target.value)}
                    />
                  </Field>
                  <Field label="60 time ≤ (sec)" htmlFor="sx">
                    <Input
                      id="sx"
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="6.9"
                      value={minSixty}
                      onChange={(e) => setMinSixty(e.target.value)}
                    />
                  </Field>
                </>
              )}
              {catcher && (
                <Field label="Pop time ≤ (sec)" htmlFor="pt">
                  <Input
                    id="pt"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="2.0"
                    value={minPop}
                    onChange={(e) => setMinPop(e.target.value)}
                  />
                </Field>
              )}
            </div>

            <Field
              label="Must-haves"
              hint={
                pitcher
                  ? "Other keywords (command, strike thrower…)."
                  : "Comma-separated keywords (framing, power, command…)."
              }
              htmlFor="mh"
            >
              <Input
                id="mh"
                value={mustHave}
                onChange={(e) => setMustHave(e.target.value)}
                placeholder={pitcher ? "command, strike thrower" : "framing, power"}
              />
            </Field>
          </div>

          <div className="mt-auto pt-8">
            <Button size="lg" full onClick={() => setPhase("qualify")}>
              Continue
              <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
            </Button>
          </div>
        </div>
      )}

      {/* ---- Step 3: Who qualifies ---- */}
      {phase === "qualify" && (
        <div className="mt-5 flex flex-1 flex-col">
          <h1 className="text-2xl font-display font-bold tracking-tight">
            Who qualifies?
          </h1>
          <p className="mt-1 text-[15px] text-body-2">
            Narrow it to the players you can actually take. All optional.
          </p>

          <div className="mt-6 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Grad year from" htmlFor="gmin">
                <Select
                  id="gmin"
                  value={gradMin}
                  onChange={(e) => setGradMin(e.target.value)}
                >
                  <option value="">Any</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Grad year to" htmlFor="gmax">
                <Select
                  id="gmax"
                  value={gradMax}
                  onChange={(e) => setGradMax(e.target.value)}
                >
                  <option value="">Any</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <label className="flex items-center gap-3 rounded-input border border-border bg-surface p-3">
              <input
                type="checkbox"
                checked={acceptsTransfer}
                onChange={(e) => setAcceptsTransfer(e.target.checked)}
                className="h-5 w-5 accent-accent"
              />
              <span className="text-[15px] text-ink">Open to transfers</span>
            </label>

            <Field label="Minimum GPA" htmlFor="gpa" hint="Leave blank for no floor.">
              <Input
                id="gpa"
                type="number"
                step="0.01"
                min="0"
                max="4"
                inputMode="decimal"
                placeholder="2.5"
                value={minGpa}
                onChange={(e) => setMinGpa(e.target.value)}
              />
            </Field>
          </div>

          <div className="mt-auto pt-8">
            <Button size="lg" full onClick={generateAndReview}>
              <Sparkles size={18} strokeWidth={2} aria-hidden />
              Generate post
            </Button>
            <p className="mt-2 text-center text-xs text-muted-2">
              We&rsquo;ll draft a headline and description — you can edit everything next.
            </p>
          </div>
        </div>
      )}

      {/* ---- Step 4: Review & post ---- */}
      {phase === "review" && (
        <div className="mt-5 flex flex-1 flex-col">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-display font-bold tracking-tight">
              {editing ? "Edit your post" : "Review your post"}
            </h1>
            <button
              type="button"
              onClick={regenerate}
              disabled={regenerating}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-btn border border-border px-3 py-1.5 text-sm font-semibold text-body-2 disabled:opacity-50"
            >
              <Sparkles size={15} strokeWidth={2} aria-hidden />
              {regenerating ? "Regenerating…" : "Regenerate"}
            </button>
          </div>
          <p className="mt-1 text-[15px] text-body-2">
            This is what players see. Tweak anything, then post it.
          </p>

          <div className="mt-6 space-y-5">
            <Field label="Headline" htmlFor="t">
              <Input
                id="t"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setTitleEdited(true);
                }}
                placeholder="e.g. RHP — mid-80s+"
              />
            </Field>

            <Field label="Short description" htmlFor="d">
              <Textarea
                id="d"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What you're looking for, role, timeline…"
                maxLength={500}
                rows={4}
              />
            </Field>

            {genNote && <p className="text-xs text-muted-2">{genNote}</p>}
          </div>

          {error && <p className="mt-4 text-sm text-danger">{error}</p>}

          <div className="mt-auto pt-8">
            <Button size="lg" full onClick={submit} disabled={saving}>
              {saving
                ? "Posting…"
                : editing
                  ? "Save changes"
                  : firstNeed
                    ? "Post need & open my inbox"
                    : "Post need"}
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
