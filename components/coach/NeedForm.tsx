"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Plus, Sparkles, X } from "lucide-react";
import { HeaderActions } from "@/components/HeaderActions";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { StepProgress } from "@/components/ui/ProgressBar";
import { BaseballIcon } from "@/components/ui/BaseballIcon";
import {
  POSITIONS,
  PITCHES,
  PITCHER_ROLES,
  PITCHER_TRAITS,
  CATCHER_TRAITS,
  HITTER_TRAITS,
  PLAYER_LEVELS,
  KNOWN_PITCHER_ROLES,
  isPitcher,
  isCatcher,
} from "@/lib/constants";
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
type Phase =
  | "position"
  | "player"
  | "academics"
  | "skills"
  | "generating"
  | "review";
const STEP_LABELS = ["Position", "Player type", "Academics", "Details", "Review"];

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

  // Split an edited need's must_have bag back into its structured chips.
  const initialMust = need?.must_have ?? [];
  const pitchesInit = initialMust.filter((m) => PITCH_SET.has(m));
  const rolesInit = initialMust.filter((m) => KNOWN_PITCHER_ROLES.has(m));
  const traitsInit = initialMust.filter(
    (m) => !PITCH_SET.has(m) && !KNOWN_PITCHER_ROLES.has(m)
  );

  // Editing an existing need drops straight into review; a new need walks
  // forward from position.
  const [phase, setPhase] = useState<Phase>(editing ? "review" : "position");

  // A need is one position at a time.
  const [position, setPosition] = useState<string>(need?.positions?.[0] ?? "");
  const [title, setTitle] = useState(need?.title ?? "");
  // Once the coach edits the title we stop auto-suggesting it.
  const [titleEdited, setTitleEdited] = useState(!!need?.title);

  // Who the need targets.
  const [playerTypes, setPlayerTypes] = useState<string[]>(
    need?.player_types ?? []
  );
  const [gradMin, setGradMin] = useState(need?.grad_year_min?.toString() ?? "");
  const [gradMax, setGradMax] = useState(need?.grad_year_max?.toString() ?? "");
  const [minGpa, setMinGpa] = useState(need?.min_gpa?.toString() ?? "");

  // Skill-specific.
  const [pitchesWanted, setPitchesWanted] = useState<string[]>(pitchesInit);
  const [rolesWanted, setRolesWanted] = useState<string[]>(rolesInit);
  const [traits, setTraits] = useState<string[]>(traitsInit);
  const [customDraft, setCustomDraft] = useState("");
  const [minExit, setMinExit] = useState(need?.min_exit_velo?.toString() ?? "");
  const [minFb, setMinFb] = useState(need?.min_fastball_velo?.toString() ?? "");
  const [minSixty, setMinSixty] = useState(need?.min_sixty?.toString() ?? "");
  const [minPop, setMinPop] = useState(need?.min_pop_time?.toString() ?? "");

  const [description, setDescription] = useState(need?.description ?? "");
  const [genNote, setGenNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [regenerating, setRegenerating] = useState(false);

  const num = (v: string) => (v === "" ? null : Number(v));
  const valid = !!title.trim() && !!position;

  const pitcher = isPitcher(position);
  const catcher = isCatcher(position);
  const hitter = !!position && !pitcher; // catcher counts as a hitter here
  const wantsHS = playerTypes.includes("high_school");

  const presetTraits = pitcher
    ? PITCHER_TRAITS
    : catcher
      ? CATCHER_TRAITS
      : HITTER_TRAITS;
  const presetSet = new Set<string>(presetTraits as readonly string[]);
  const customTraits = traits.filter((t) => !presetSet.has(t));

  function pickPosition(pos: string) {
    setPosition(pos);
    if (!titleEdited || title.trim() === "") {
      setTitle(POSITION_TITLE[pos] ?? "");
      setTitleEdited(false);
    }
    // Drop metric/role values that don't apply to the new position's bucket.
    if (isPitcher(pos)) {
      setMinExit("");
      setMinSixty("");
      setMinPop("");
    } else {
      setMinFb("");
      setPitchesWanted([]);
      setRolesWanted([]);
      if (!isCatcher(pos)) setMinPop("");
    }
  }

  const toggleIn =
    (setter: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) =>
      setter((cur) =>
        cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]
      );
  const togglePitch = toggleIn(setPitchesWanted);
  const toggleRole = toggleIn(setRolesWanted);
  const toggleTrait = toggleIn(setTraits);
  const togglePlayerType = toggleIn(setPlayerTypes);

  function addCustomTrait() {
    const v = customDraft.trim();
    if (!v) return;
    if (!traits.some((t) => t.toLowerCase() === v.toLowerCase())) {
      setTraits((cur) => [...cur, v]);
    }
    setCustomDraft("");
  }

  // Build the must_have bag from every structured chip, de-duplicated.
  function buildMustHave(): string[] {
    return Array.from(
      new Set([
        ...(pitcher ? pitchesWanted : []),
        ...(pitcher ? rolesWanted : []),
        ...traits,
      ])
    );
  }

  // Ask the AI to write a headline + short description from what's entered.
  async function generate() {
    if (!position) return;
    setGenNote("");
    try {
      const res = await fetch("/api/ai/need", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          position,
          playerTypes,
          gradMin,
          gradMax,
          acceptsTransfer: playerTypes.some((t) => t !== "high_school"),
          minGpa,
          pitches: pitcher ? pitchesWanted : [],
          pitcherRoles: pitcher ? rolesWanted : [],
          mustHave: traits,
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
      const data = (await res.json()) as { title?: string; description?: string };
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

  // Skills → "Generate post": show the spinner, draft, then land on review.
  async function generateAndReview() {
    setPhase("generating");
    await generate();
    setPhase("review");
  }

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

    const payload = {
      program_id: programId,
      title: title.trim(),
      positions: [position],
      player_types: playerTypes,
      // Grad-year window only matters when HS recruits are in the pool.
      grad_year_min: wantsHS ? num(gradMin) : null,
      grad_year_max: wantsHS ? num(gradMax) : null,
      // Legacy flag mirrors "any transfer type selected" for older readers.
      accepts_transfer: playerTypes.some((t) => t !== "high_school"),
      min_gpa: minGpa === "" ? 0 : Number(minGpa),
      must_have: buildMustHave(),
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
    router.push(firstNeed ? "/inbox" : "/needs");
    router.refresh();
  }

  const years = (() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => now + i - 2);
  })();

  function goBack() {
    if (phase === "player") setPhase("position");
    else if (phase === "academics") setPhase("player");
    else if (phase === "skills") setPhase("academics");
    else if (phase === "review") setPhase(editing ? "position" : "skills");
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
    phase === "position"
      ? 1
      : phase === "player"
        ? 2
        : phase === "academics"
          ? 3
          : phase === "skills"
            ? 4
            : 5;

  const skillHeading = pitcher
    ? "What you want on the mound"
    : catcher
      ? "What you want behind the plate"
      : "What you want at the plate";

  const chip = (active: boolean) =>
    cn(
      "h-9 rounded-pill px-3.5 text-sm font-semibold transition-colors",
      active ? "bg-accent text-surface" : "bg-chip text-body-2 hover:bg-accent-soft"
    );

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
      <StepProgress total={5} current={stepNum} className="mt-5" />
      <p className="mt-2 text-[11px] font-bold uppercase tracking-eyebrow text-muted-2">
        Step {stepNum} of 5 · {STEP_LABELS[stepNum - 1]}
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
            {POSITIONS.map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => pickPosition(pos)}
                className={cn(
                  "h-11 rounded-pill px-4 text-sm font-semibold transition-colors",
                  position === pos
                    ? "bg-accent text-surface"
                    : "bg-chip text-body-2 hover:bg-accent-soft"
                )}
              >
                {pos}
              </button>
            ))}
          </div>

          <div className="mt-auto pt-8">
            <Button size="lg" full onClick={() => setPhase("player")} disabled={!position}>
              Continue
              <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
            </Button>
          </div>
        </div>
      )}

      {/* ---- Step 2: Player type ---- */}
      {phase === "player" && (
        <div className="mt-5 flex flex-1 flex-col">
          <h1 className="text-2xl font-display font-bold tracking-tight">
            Who are you recruiting?
          </h1>
          <p className="mt-1 text-[15px] text-body-2">
            Pick every type of player who fits — tap more than one if it does.
          </p>

          <div className="mt-6 space-y-2">
            {PLAYER_LEVELS.map((lvl) => {
              const active = playerTypes.includes(lvl.value);
              return (
                <button
                  key={lvl.value}
                  type="button"
                  onClick={() => togglePlayerType(lvl.value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-input border p-4 text-left transition-colors",
                    active
                      ? "border-accent bg-accent-soft"
                      : "border-border bg-surface hover:bg-chip"
                  )}
                >
                  <span className="text-[15px] font-semibold text-ink">
                    {lvl.label}
                  </span>
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-md border",
                      active ? "border-accent bg-accent text-surface" : "border-border"
                    )}
                  >
                    {active && <span className="text-xs font-bold">✓</span>}
                  </span>
                </button>
              );
            })}
          </div>

          {wantsHS && (
            <div className="mt-6">
              <p className="eyebrow mb-2">High school grad years</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="From" htmlFor="gmin">
                  <Select id="gmin" value={gradMin} onChange={(e) => setGradMin(e.target.value)}>
                    <option value="">Any</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="To" htmlFor="gmax">
                  <Select id="gmax" value={gradMax} onChange={(e) => setGradMax(e.target.value)}>
                    <option value="">Any</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>
          )}

          <div className="mt-auto pt-8">
            <Button size="lg" full onClick={() => setPhase("academics")}>
              Continue
              <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
            </Button>
            {playerTypes.length === 0 && (
              <p className="mt-2 text-center text-xs text-muted-2">
                Pick none and it&rsquo;s open to every type of player.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ---- Step 3: Academics ---- */}
      {phase === "academics" && (
        <div className="mt-5 flex flex-1 flex-col">
          <h1 className="text-2xl font-display font-bold tracking-tight">
            Academics
          </h1>
          <p className="mt-1 text-[15px] text-body-2">
            Set a GPA floor so you only hear from players who can get in.
          </p>

          <div className="mt-6">
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
            <Button size="lg" full onClick={() => setPhase("skills")}>
              Continue
              <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
            </Button>
          </div>
        </div>
      )}

      {/* ---- Step 4: Skill-specific ---- */}
      {phase === "skills" && (
        <div className="mt-5 flex flex-1 flex-col">
          <h1 className="text-2xl font-display font-bold tracking-tight">
            {skillHeading}
          </h1>
          <p className="mt-1 text-[15px] text-body-2">
            Set the bar so only players who clear it see this. All optional.
          </p>

          <div className="mt-6 space-y-5">
            {pitcher && (
              <>
                <div>
                  <p className="mb-2 text-sm font-medium text-body-2">
                    Role you need
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PITCHER_ROLES.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleRole(r)}
                        className={chip(rolesWanted.includes(r))}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-body-2">
                    Pitches you&rsquo;re looking for
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PITCHES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePitch(p)}
                        className={chip(pitchesWanted.includes(p))}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </>
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

            {/* Traits — tap presets, or add your own. */}
            <div>
              <p className="mb-2 text-sm font-medium text-body-2">
                Traits you value
              </p>
              <div className="flex flex-wrap gap-2">
                {presetTraits.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTrait(t)}
                    className={chip(traits.includes(t))}
                  >
                    {t}
                  </button>
                ))}
                {customTraits.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTrait(t)}
                    className="inline-flex h-9 items-center gap-1 rounded-pill bg-accent px-3.5 text-sm font-semibold text-surface"
                  >
                    {t}
                    <X size={14} strokeWidth={2.5} aria-hidden />
                  </button>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  value={customDraft}
                  onChange={(e) => setCustomDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomTrait();
                    }
                  }}
                  placeholder="Add your own…"
                />
                <button
                  type="button"
                  onClick={addCustomTrait}
                  disabled={!customDraft.trim()}
                  className="inline-flex shrink-0 items-center gap-1 rounded-btn border border-border px-3 text-sm font-semibold text-body-2 disabled:opacity-50"
                >
                  <Plus size={16} strokeWidth={2.5} aria-hidden />
                  Add
                </button>
              </div>
            </div>
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

      {/* ---- Step 5: Review & post ---- */}
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
