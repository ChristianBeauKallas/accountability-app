"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Target,
  ShieldCheck,
  Inbox,
  ClipboardList,
  Building2,
  Compass,
  ListChecks,
  User,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { StepProgress } from "@/components/ui/ProgressBar";
import {
  POSITIONS,
  DIVISIONS,
  STATES,
  BATS,
  THROWS,
  isPitcher,
  isCatcher,
  isOutfielder,
} from "@/lib/constants";
import type { UserRole } from "@/lib/types";

type Step = "how" | "profile" | "tour";

export function OnboardingFlow({
  userId,
  role,
  initialName,
}: {
  userId: string;
  role: UserRole;
  initialName: string;
}) {
  const [step, setStep] = useState<Step>("how");
  const stepIndex = step === "how" ? 1 : step === "profile" ? 2 : 3;

  return (
    <main className="min-h-dvh flex flex-col px-6 pt-12 pb-10">
      <div className="flex items-center gap-4">
        {step !== "how" ? (
          <button
            onClick={() => setStep(step === "tour" ? "profile" : "how")}
            className="text-muted"
            aria-label="Back"
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
        ) : (
          <span className="w-[22px]" />
        )}
        <StepProgress total={3} current={stepIndex} className="flex-1" />
      </div>

      <div className="mt-8 flex-1">
        {step === "how" && <HowItWorks role={role} />}
        {step === "profile" &&
          (role === "coach" ? (
            <CoachProfile userId={userId} initialName={initialName} />
          ) : (
            <PlayerProfile userId={userId} initialName={initialName} />
          ))}
        {step === "tour" && <AppTour role={role} userId={userId} />}
      </div>

      {step === "how" && (
        <Button size="lg" full onClick={() => setStep("profile")}>
          Get started
          <ArrowRight size={18} strokeWidth={2} aria-hidden />
        </Button>
      )}
    </main>
  );
}

/* ----------------------------- Step 1: How ----------------------------- */

function HowItWorks({ role }: { role: UserRole }) {
  const items: { icon: LucideIcon; title: string; body: string }[] =
    role === "coach"
      ? [
          {
            icon: ClipboardList,
            title: "Post the spots you need",
            body: "List what you're recruiting for — position, class, and the bar you expect.",
          },
          {
            icon: Inbox,
            title: "See who fits, first",
            body: "Only players who fit show up, strongest first. No cold DMs to dig through.",
          },
          {
            icon: ShieldCheck,
            title: "Reach out on your terms",
            body: "You see a player once they show interest. Mark interest back and reach out.",
          },
        ]
      : [
          {
            icon: User,
            title: "Build your profile",
            body: "Add your metrics, video, academics, and the levels and schools you want — everything a coach recruits on.",
          },
          {
            icon: Target,
            title: "We find your best fits",
            body: "Our algorithm compares your profile to what every program is recruiting and ranks the spots you fit best.",
          },
          {
            icon: ShieldCheck,
            title: "Show interest, your call",
            body: "Tap I'm Interested and the coach sees you. Coaches can't browse players — you decide who gets your info.",
          },
        ];

  return (
    <div>
      <h1 className="text-3xl font-display font-bold tracking-tight">
        How Athletx works
      </h1>
      <p className="mt-2 text-body-2">
        {role === "coach"
          ? "Built to make recruiting less noisy."
          : "Build your profile — our algorithm does the recruiting legwork."}
      </p>
      <ul className="mt-8 space-y-6">
        {items.map(({ icon: Icon, title, body }, i) => (
          <li key={i} className="flex items-start gap-4">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-accent-soft text-accent">
              <Icon size={20} strokeWidth={2} aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-display font-semibold leading-tight">
                {title}
              </h2>
              <p className="mt-1 text-[15px] text-body-2">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------- Step 2: Player profile ----------------------- */

function PlayerProfile({
  userId,
  initialName,
}: {
  userId: string;
  initialName: string;
}) {
  const supabase = createClient();
  const [name, setName] = useState(initialName);
  const [gradYear, setGradYear] = useState("");
  const [picked, setPicked] = useState<string[]>([]); // click order; [0] = primary
  const [bats, setBats] = useState("");
  const [throws, setThrows] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [gpa, setGpa] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weight, setWeight] = useState("");
  const [isTransfer, setIsTransfer] = useState(false);
  const [currentSchool, setCurrentSchool] = useState("");
  const [sixty, setSixty] = useState("");
  const [exitVelo, setExitVelo] = useState("");
  const [throwVelo, setThrowVelo] = useState("");
  const [fastball, setFastball] = useState("");
  const [popTime, setPopTime] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const primary = picked[0] ?? null;

  function togglePos(pos: string) {
    setPicked((cur) =>
      cur.includes(pos) ? cur.filter((p) => p !== pos) : [...cur, pos]
    );
  }

  const valid =
    name.trim() &&
    gradYear &&
    picked.length > 0 &&
    state &&
    gpa &&
    Number(gpa) >= 0 &&
    Number(gpa) <= 4;

  async function finish() {
    setError("");
    if (!valid) {
      setError("Add your name, grad year, position, state and GPA to continue.");
      return;
    }
    setSaving(true);
    const totalHeight =
      heightFt || heightIn
        ? Number(heightFt || 0) * 12 + Number(heightIn || 0)
        : null;

    const num = (v: string) => (v === "" ? null : Number(v));

    const { error: pErr } = await supabase
      .from("profiles")
      .update({ full_name: name.trim(), onboarded: true })
      .eq("id", userId);

    const { error: plErr } = await supabase
      .from("players")
      .update({
        grad_year: Number(gradYear),
        primary_position: primary,
        positions: picked,
        bats: bats || null,
        throws: throws || null,
        height_in: totalHeight,
        weight_lb: num(weight),
        gpa: num(gpa),
        city: city.trim() || null,
        state: state || null,
        is_transfer: isTransfer,
        current_school: isTransfer ? currentSchool.trim() || null : null,
        sixty_yd: num(sixty),
        exit_velo: isPitcher(primary) ? null : num(exitVelo),
        inf_velo:
          !isPitcher(primary) && !isCatcher(primary) && !isOutfielder(primary)
            ? num(throwVelo)
            : null,
        of_velo: isOutfielder(primary) ? num(throwVelo) : null,
        fastball_velo: isPitcher(primary) ? num(fastball) : null,
        pop_time: isCatcher(primary) ? num(popTime) : null,
        bio: bio.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (pErr || plErr) {
      setSaving(false);
      setError((pErr ?? plErr)?.message ?? "Something went wrong. Try again.");
      return;
    }
    window.location.href = "/fits";
  }

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => now + i - 1);
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">
          Build your profile
        </h1>
        <p className="mt-2 text-body-2">
          This is your application. The more complete, the better your fits.
        </p>
      </div>

      <Field label="Full name" htmlFor="name">
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>

      <Field label="Positions" hint="Tap all you play — your first pick is your primary.">
        <div className="flex flex-wrap gap-2">
          {POSITIONS.map((pos) => {
            const active = picked.includes(pos);
            const isPrimary = primary === pos;
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
                {isPrimary ? `★ ${pos}` : pos}
              </button>
            );
          })}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Grad year" htmlFor="grad">
          <Select
            id="grad"
            value={gradYear}
            onChange={(e) => setGradYear(e.target.value)}
          >
            <option value="">Select</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="GPA" htmlFor="gpa">
          <Input
            id="gpa"
            type="number"
            step="0.01"
            min="0"
            max="4"
            inputMode="decimal"
            placeholder="3.4"
            value={gpa}
            onChange={(e) => setGpa(e.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="City" htmlFor="city">
          <Input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Wichita"
          />
        </Field>
        <Field label="State" htmlFor="state">
          <Select
            id="state"
            value={state}
            onChange={(e) => setState(e.target.value)}
          >
            <option value="">Select</option>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Bats" htmlFor="bats">
          <Select id="bats" value={bats} onChange={(e) => setBats(e.target.value)}>
            <option value="">—</option>
            {BATS.map((b) => (
              <option key={b} value={b}>
                {b === "S" ? "Switch" : b === "R" ? "Right" : "Left"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Throws" htmlFor="throws">
          <Select
            id="throws"
            value={throws}
            onChange={(e) => setThrows(e.target.value)}
          >
            <option value="">—</option>
            {THROWS.map((t) => (
              <option key={t} value={t}>
                {t === "R" ? "Right" : "Left"}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Height" htmlFor="hft">
          <div className="flex gap-2">
            <Input
              id="hft"
              type="number"
              inputMode="numeric"
              placeholder="6"
              value={heightFt}
              onChange={(e) => setHeightFt(e.target.value)}
              aria-label="Feet"
            />
            <Input
              type="number"
              inputMode="numeric"
              placeholder="1"
              value={heightIn}
              onChange={(e) => setHeightIn(e.target.value)}
              aria-label="Inches"
            />
          </div>
        </Field>
        <Field label="Weight" htmlFor="wt">
          <Input
            id="wt"
            type="number"
            inputMode="numeric"
            placeholder="190"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </Field>
        <Field label="60 time" htmlFor="sixty">
          <Input
            id="sixty"
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="6.8"
            value={sixty}
            onChange={(e) => setSixty(e.target.value)}
          />
        </Field>
      </div>

      {/* Position-aware metrics */}
      <div className="grid grid-cols-2 gap-3">
        {isPitcher(primary) ? (
          <Field label="Fastball velo (mph)" htmlFor="fb">
            <Input
              id="fb"
              type="number"
              inputMode="numeric"
              placeholder="86"
              value={fastball}
              onChange={(e) => setFastball(e.target.value)}
            />
          </Field>
        ) : (
          <Field label="Exit velo (mph)" htmlFor="ev">
            <Input
              id="ev"
              type="number"
              inputMode="numeric"
              placeholder="92"
              value={exitVelo}
              onChange={(e) => setExitVelo(e.target.value)}
            />
          </Field>
        )}
        {isCatcher(primary) ? (
          <Field label="Pop time (sec)" htmlFor="pop">
            <Input
              id="pop"
              type="number"
              step="0.01"
              inputMode="decimal"
              placeholder="1.95"
              value={popTime}
              onChange={(e) => setPopTime(e.target.value)}
            />
          </Field>
        ) : !isPitcher(primary) ? (
          <Field
            label={isOutfielder(primary) ? "OF velo (mph)" : "INF velo (mph)"}
            htmlFor="tv"
          >
            <Input
              id="tv"
              type="number"
              inputMode="numeric"
              placeholder="82"
              value={throwVelo}
              onChange={(e) => setThrowVelo(e.target.value)}
            />
          </Field>
        ) : (
          <span />
        )}
      </div>

      <label className="flex items-center gap-3 rounded-input border border-border bg-surface p-3">
        <input
          type="checkbox"
          checked={isTransfer}
          onChange={(e) => setIsTransfer(e.target.checked)}
          className="h-5 w-5 accent-accent"
        />
        <span className="text-[15px] text-ink">
          I&rsquo;m a transfer (currently in college)
        </span>
      </label>
      {isTransfer && (
        <Field label="Current school" htmlFor="cs">
          <Input
            id="cs"
            value={currentSchool}
            onChange={(e) => setCurrentSchool(e.target.value)}
            placeholder="Cowley College"
          />
        </Field>
      )}

      <Field label="About you" hint="One or two lines coaches should know.">
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Lefty bat, plus runner, team captain…"
          maxLength={280}
        />
      </Field>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button size="lg" full onClick={finish} disabled={saving}>
        {saving ? "Saving…" : "Finish & see my fits"}
        {!saving && <ArrowRight size={18} strokeWidth={2} aria-hidden />}
      </Button>
    </div>
  );
}

/* ------------------------- Step 2: Coach profile ------------------------ */

function CoachProfile({
  userId,
  initialName,
}: {
  userId: string;
  initialName: string;
}) {
  const supabase = createClient();
  const [name, setName] = useState(initialName);
  const [staffRole, setStaffRole] = useState("head");
  const [programName, setProgramName] = useState("");
  const [division, setDivision] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [conference, setConference] = useState("");
  const [about, setAbout] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const valid = name.trim() && programName.trim() && division && state;

  async function finish() {
    setError("");
    if (!valid) {
      setError("Add your name, program, division and state to continue.");
      return;
    }
    setSaving(true);

    const { error: pErr } = await supabase
      .from("profiles")
      .update({ full_name: name.trim(), onboarded: true })
      .eq("id", userId);

    const { data: program, error: progErr } = await supabase
      .from("programs")
      .insert({
        name: programName.trim(),
        division,
        city: city.trim() || null,
        state,
        conference: conference.trim() || null,
        about: about.trim() || null,
      })
      .select("id")
      .single();

    if (progErr || !program) {
      setSaving(false);
      setError(progErr?.message ?? "Couldn't create your program. Try again.");
      return;
    }

    const { error: staffErr } = await supabase.from("program_staff").insert({
      program_id: program.id,
      profile_id: userId,
      staff_role: staffRole,
    });

    if (pErr || staffErr) {
      setSaving(false);
      setError((pErr ?? staffErr)?.message ?? "Something went wrong.");
      return;
    }
    window.location.href = "/inbox";
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">
          Set up your program
        </h1>
        <p className="mt-2 text-body-2">
          This is what players see when you post a need.
        </p>
      </div>

      <Field label="Your name" htmlFor="cname">
        <Input
          id="cname"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field label="Your role" htmlFor="srole">
        <Select
          id="srole"
          value={staffRole}
          onChange={(e) => setStaffRole(e.target.value)}
        >
          <option value="head">Head coach</option>
          <option value="assistant">Assistant coach</option>
          <option value="recruiting_coordinator">Recruiting coordinator</option>
        </Select>
      </Field>

      <Field label="Program name" htmlFor="pname">
        <Input
          id="pname"
          value={programName}
          onChange={(e) => setProgramName(e.target.value)}
          placeholder="Cowley College"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Division" htmlFor="div">
          <Select
            id="div"
            value={division}
            onChange={(e) => setDivision(e.target.value)}
          >
            <option value="">Select</option>
            {DIVISIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="State" htmlFor="cstate">
          <Select
            id="cstate"
            value={state}
            onChange={(e) => setState(e.target.value)}
          >
            <option value="">Select</option>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="City" htmlFor="ccity">
          <Input
            id="ccity"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Arkansas City"
          />
        </Field>
        <Field label="Conference" htmlFor="conf">
          <Input
            id="conf"
            value={conference}
            onChange={(e) => setConference(e.target.value)}
            placeholder="KJCCC"
          />
        </Field>
      </div>

      <Field label="About the program" hint="Optional — a line or two for players.">
        <Textarea
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder="JUCO contender with a strong four-year transfer pipeline…"
          maxLength={400}
        />
      </Field>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button size="lg" full onClick={finish} disabled={saving}>
        {saving ? "Saving…" : "Finish & open my inbox"}
        {!saving && <ArrowRight size={18} strokeWidth={2} aria-hidden />}
      </Button>
    </div>
  );
}

/* ----------------------------- Step 3: Tour ----------------------------- */
// Shown only if we ever route here; the profile step finishes onboarding
// directly. Kept for completeness / future use.

function AppTour({ role }: { role: UserRole; userId: string }) {
  const tabs: { icon: LucideIcon; label: string; body: string }[] =
    role === "coach"
      ? [
          { icon: Inbox, label: "Inbox", body: "Players who want your spots, best fit first." },
          { icon: ClipboardList, label: "Needs", body: "Post and manage your open spots." },
          { icon: Building2, label: "Program", body: "Your public program page." },
        ]
      : [
          { icon: Compass, label: "Fits", body: "Spots you fit, strongest matches first." },
          { icon: ListChecks, label: "My Spots", body: "Spots you're interested in, and where each stands." },
          { icon: User, label: "Profile", body: "Your profile, updates and highlights." },
        ];

  return (
    <div>
      <h1 className="text-3xl font-display font-bold tracking-tight">
        You&rsquo;re all set
      </h1>
      <p className="mt-2 text-body-2">Here&rsquo;s where everything lives.</p>
      <ul className="mt-8 space-y-4">
        {tabs.map(({ icon: Icon, label, body }) => (
          <li
            key={label}
            className="flex items-center gap-4 rounded-card border border-border bg-surface p-4 shadow-card"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-pill bg-accent-soft text-accent">
              <Icon size={20} strokeWidth={2} aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold">{label}</h2>
              <p className="text-sm text-body-2">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
