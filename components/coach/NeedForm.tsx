"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { POSITIONS } from "@/lib/constants";
import type { Need } from "@/lib/types";

export function NeedForm({
  programId,
  need,
}: {
  programId: string;
  need?: Need;
}) {
  const supabase = createClient();
  const router = useRouter();
  const editing = !!need;

  const [title, setTitle] = useState(need?.title ?? "");
  const [picked, setPicked] = useState<string[]>(need?.positions ?? []);
  const [gradMin, setGradMin] = useState(need?.grad_year_min?.toString() ?? "");
  const [gradMax, setGradMax] = useState(need?.grad_year_max?.toString() ?? "");
  const [acceptsTransfer, setAcceptsTransfer] = useState(
    need?.accepts_transfer ?? false
  );
  const [minGpa, setMinGpa] = useState(need?.min_gpa?.toString() ?? "");
  const [mustHave, setMustHave] = useState((need?.must_have ?? []).join(", "));
  const [minExit, setMinExit] = useState(need?.min_exit_velo?.toString() ?? "");
  const [minFb, setMinFb] = useState(need?.min_fastball_velo?.toString() ?? "");
  const [minSixty, setMinSixty] = useState(need?.min_sixty?.toString() ?? "");
  const [minPop, setMinPop] = useState(need?.min_pop_time?.toString() ?? "");
  const [description, setDescription] = useState(need?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const num = (v: string) => (v === "" ? null : Number(v));
  const valid = title.trim() && picked.length > 0;

  function togglePos(pos: string) {
    setPicked((cur) =>
      cur.includes(pos) ? cur.filter((p) => p !== pos) : [...cur, pos]
    );
  }

  async function submit() {
    setError("");
    if (!valid) {
      setError("Add a title and at least one position.");
      return;
    }
    setSaving(true);
    const payload = {
      program_id: programId,
      title: title.trim(),
      positions: picked,
      grad_year_min: num(gradMin),
      grad_year_max: num(gradMax),
      accepts_transfer: acceptsTransfer,
      min_gpa: minGpa === "" ? 0 : Number(minGpa),
      must_have: mustHave
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      min_exit_velo: num(minExit),
      min_fastball_velo: num(minFb),
      min_sixty: num(minSixty),
      min_pop_time: num(minPop),
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
    router.push("/needs");
    router.refresh();
  }

  const years = (() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => now + i - 2);
  })();

  return (
    <main className="px-5 pt-12 pb-6">
      <Link
        href="/needs"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted"
      >
        <ArrowLeft size={16} strokeWidth={2} aria-hidden />
        Needs
      </Link>

      <h1 className="mt-4 text-3xl font-display font-bold tracking-tight">
        {editing ? "Edit need" : "Post a need"}
      </h1>
      <p className="mt-1 text-[15px] text-body-2">
        Only players who fit see this — and they put their name in with one tap.
      </p>

      <div className="mt-6 space-y-5">
        <Field label="Title" hint="What you're recruiting, in a few words." htmlFor="t">
          <Input
            id="t"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="RHP — mid-80s+"
          />
        </Field>

        <Field label="Positions" hint="Players at any of these can go for it.">
          <div className="flex flex-wrap gap-2">
            {POSITIONS.map((pos) => {
              const active = picked.includes(pos);
              return (
                <button
                  key={pos}
                  type="button"
                  onClick={() => togglePos(pos)}
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
            className="h-5 w-5 accent-[#1F5C3D]"
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
          hint="Comma-separated keywords (framing, power, command…)."
          htmlFor="mh"
        >
          <Input
            id="mh"
            value={mustHave}
            onChange={(e) => setMustHave(e.target.value)}
            placeholder="command, strike thrower"
          />
        </Field>

        <div>
          <p className="eyebrow mb-2">Set the bar (optional)</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Exit velo ≥" htmlFor="ev">
              <Input
                id="ev"
                type="number"
                inputMode="numeric"
                placeholder="92"
                value={minExit}
                onChange={(e) => setMinExit(e.target.value)}
              />
            </Field>
            <Field label="Fastball ≥" htmlFor="fb">
              <Input
                id="fb"
                type="number"
                inputMode="numeric"
                placeholder="85"
                value={minFb}
                onChange={(e) => setMinFb(e.target.value)}
              />
            </Field>
            <Field label="60 time ≤" htmlFor="sx">
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
            <Field label="Pop time ≤" htmlFor="pt">
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
          </div>
        </div>

        <Field label="Description" htmlFor="d">
          <Textarea
            id="d"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What you're looking for, role, timeline…"
            maxLength={500}
          />
        </Field>

        {error && <p className="text-sm text-warm-text">{error}</p>}

        <Button size="lg" full onClick={submit} disabled={saving}>
          {saving ? "Saving…" : editing ? "Save changes" : "Post need"}
        </Button>
      </div>
    </main>
  );
}
