"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { HeaderActions } from "@/components/HeaderActions";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
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

  async function submit() {
    setError("");
    if (!valid) {
      setError("Pick a position and add a title.");
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
    // After the very first need, drop into the inbox with the welcome tour.
    router.push(firstNeed ? "/inbox?welcome=1" : "/needs");
    router.refresh();
  }

  const years = (() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => now + i - 2);
  })();

  return (
    <main className="px-5 pt-12 pb-6">
      <div className="flex items-center justify-between">
        {firstNeed ? (
          <Link
            href="/inbox?welcome=1"
            className="text-sm font-semibold text-muted"
          >
            Skip for now
          </Link>
        ) : (
          <Link
            href="/needs"
            className="inline-flex items-center gap-1 text-sm font-semibold text-muted"
          >
            <ArrowLeft size={16} strokeWidth={2} aria-hidden />
            Needs
          </Link>
        )}
        <HeaderActions />
      </div>

      {firstNeed && <p className="eyebrow mt-4">Last step</p>}
      <h1
        className={cn(
          "text-3xl font-display font-bold tracking-tight",
          firstNeed ? "mt-1" : "mt-4"
        )}
      >
        {editing
          ? "Edit need"
          : firstNeed
            ? "Post your first need"
            : "Post a need"}
      </h1>
      <p className="mt-1 text-[15px] text-body-2">
        {firstNeed
          ? "This is how players find you — only those who fit see it, and they show interest with one tap. You can post more anytime."
          : "Only players who fit see this — and they show interest with one tap."}
      </p>

      <div className="mt-6 space-y-5">
        {/* 1. Position first — one per need. */}
        <Field label="Position" hint="One spot per need — post another for each spot.">
          <div className="flex flex-wrap gap-2">
            {POSITIONS.map((pos) => {
              const active = position === pos;
              return (
                <button
                  key={pos}
                  type="button"
                  onClick={() => pickPosition(pos)}
                  className={cn(
                    "h-9 rounded-pill px-3.5 text-sm font-semibold transition-colors",
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
        </Field>

        {/* 2. Title — suggested from the position, fully editable. */}
        <Field
          label="Title"
          hint={
            position
              ? "Suggested from the position — edit it however you like."
              : "Pick a position and we'll suggest a title."
          }
          htmlFor="t"
        >
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

        {/* 3. Position-specific bar — only the metrics that fit the spot. */}
        {position && (
          <div>
            <p className="eyebrow mb-2">
              {pitcher
                ? "What you want on the mound (optional)"
                : "Set the bar (optional)"}
            </p>

            {pitcher && (
              <div className="mb-3">
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
          </div>
        )}

        {/* 4. Who qualifies. */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Grad year from" htmlFor="gmin">
            <Select id="gmin" value={gradMin} onChange={(e) => setGradMin(e.target.value)}>
              <option value="">Any</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Grad year to" htmlFor="gmax">
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

        <Field label="Description" htmlFor="d">
          <Textarea
            id="d"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What you're looking for, role, timeline…"
            maxLength={500}
          />
        </Field>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button size="lg" full onClick={submit} disabled={saving}>
          {saving
            ? "Saving…"
            : editing
              ? "Save changes"
              : firstNeed
                ? "Post need & open my inbox"
                : "Post need"}
        </Button>
      </div>
    </main>
  );
}
