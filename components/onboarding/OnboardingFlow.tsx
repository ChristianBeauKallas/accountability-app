"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Target,
  ShieldCheck,
  Inbox,
  ClipboardList,
  User,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { BaseballIcon } from "@/components/ui/BaseballIcon";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { StepProgress } from "@/components/ui/ProgressBar";
import { AboutYouAI } from "@/components/onboarding/AboutYouAI";
import {
  POSITIONS,
  DIVISIONS,
  STATES,
  BATS,
  THROWS,
  PITCHES,
  isPitcher,
  isCatcher,
  isOutfielder,
} from "@/lib/constants";
import { CLIMATES } from "@/lib/climate";
import { isEligible } from "@/lib/fit";
import { CitySearch } from "@/components/onboarding/CitySearch";
import { MockScreen, type ScreenKey } from "@/components/tour/MockScreens";
import type { UserRole, Player, Need } from "@/lib/types";

const SIZES: { value: string; label: string; hint: string }[] = [
  { value: "small", label: "Small", hint: "Under 4k" },
  { value: "medium", label: "Medium", hint: "4k–12k" },
  { value: "large", label: "Large", hint: "12k+" },
  { value: "any", label: "No preference", hint: "" },
];

export function OnboardingFlow({
  userId,
  role,
  initialName,
}: {
  userId: string;
  role: UserRole;
  initialName: string;
}) {
  if (role === "player") {
    return <PlayerWizard userId={userId} initialName={initialName} />;
  }
  return <CoachWizard userId={userId} initialName={initialName} />;
}

/* --------------------- Handoff: setting things up ----------------------- */

function Finishing({ label }: { label: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="animate-spin text-accent" style={{ animationDuration: "1.3s" }}>
        <BaseballIcon size={56} strokeWidth={2} aria-hidden />
      </div>
      <p className="font-display text-xl font-semibold text-ink">{label}</p>
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
            title: "You control the recruiting process",
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
          : "Create your player profile and our network and platform do the work for you."}
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

/* ---------------------- Player onboarding wizard ------------------------ */

type PKey =
  | "intro"
  | "name"
  | "positions"
  | "class"
  | "location"
  | "gpa"
  | "teaser"
  | "body"
  | "hitting"
  | "pitching"
  | "prefs"
  | "about"
  | "done";

// Full order; "hitting"/"pitching" are included only when they apply.
const PLAYER_STEP_ORDER: PKey[] = [
  "intro",
  "name",
  "positions",
  "class",
  "location",
  "gpa",
  "teaser",
  "body",
  "hitting",
  "pitching",
  "prefs",
  "about",
  "done",
];

function OptionPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-11 rounded-btn px-4 text-sm font-semibold transition-colors",
        active
          ? "bg-accent text-surface"
          : "bg-chip text-body-2 hover:bg-accent-soft"
      )}
    >
      {children}
    </button>
  );
}

function QHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h1 className="text-[28px] leading-tight font-display font-bold tracking-tight">
        {title}
      </h1>
      {sub && <p className="mt-2 text-body-2">{sub}</p>}
    </div>
  );
}

/* ------------------- Player intro carousel (3 steps) ------------------- */

// A scaled, framed screenshot of a real app screen, used as the hero of
// each intro slide.
const PHONE_W = 360;
const PHONE_H = 760;

function PhonePreview({ screen, height }: { screen: ScreenKey; height: number }) {
  const scale = height / PHONE_H;
  return (
    <div
      className="overflow-hidden rounded-[30px] border-[5px] border-ink/10 bg-ground shadow-sheet"
      style={{ width: PHONE_W * scale, height }}
    >
      <div
        style={{
          width: PHONE_W,
          height: PHONE_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <MockScreen screen={screen} />
      </div>
    </div>
  );
}

const PLAYER_INTRO: { screen: ScreenKey; title: string; body: string }[] = [
  {
    screen: "profile",
    title: "Build your profile",
    body: "Create your player profile — bio, metrics, video, positions, updates, highlights, school size, location and weather preferences!",
  },
  {
    screen: "fits",
    title: "Find the right fit",
    body: "Athletx compares your player profile against every open opportunity on the platform and ranks them by which ones fit you best.",
  },
  {
    screen: "fits-interested",
    title: "Control the recruiting process",
    body: "Browse the open opportunities on your fit feed and let coaches know when you're interested. Coaches don't browse you — you decide who to share your profile with.",
  },
];

function PlayerIntro({ slide }: { slide: number }) {
  const s = PLAYER_INTRO[slide];
  return (
    <div className="flex h-full flex-col">
      <p className="eyebrow">How Athletx works</p>
      <div key={`t-${slide}`} className="animate-tour-screen">
        <h1 className="mt-1 text-[26px] font-display font-bold leading-tight tracking-tight">
          {s.title}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-body-2">{s.body}</p>
      </div>
      <div className="relative mt-5 flex flex-1 items-start justify-center">
        <div key={`p-${slide}`} className="animate-tour-screen">
          <PhonePreview screen={s.screen} height={436} />
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-2">
        {PLAYER_INTRO.map((_, k) => (
          <span
            key={k}
            className={
              "h-1.5 rounded-pill transition-all " +
              (k === slide ? "w-6 bg-accent" : "w-1.5 bg-border")
            }
          />
        ))}
      </div>
    </div>
  );
}

function PlayerWizard({
  userId,
  initialName,
}: {
  userId: string;
  initialName: string;
}) {
  const supabase = createClient();
  const [i, setI] = useState(0);
  const [introSlide, setIntroSlide] = useState(0);
  const [name, setName] = useState(initialName);
  const [picked, setPicked] = useState<string[]>([]);
  const [gradYear, setGradYear] = useState("");
  const [isTransfer, setIsTransfer] = useState(false);
  const [currentSchool, setCurrentSchool] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [gpa, setGpa] = useState("");
  const [bats, setBats] = useState("");
  const [throws, setThrows] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weight, setWeight] = useState("");
  const [sixty, setSixty] = useState("");
  const [exitVelo, setExitVelo] = useState("");
  const [throwVelo, setThrowVelo] = useState("");
  const [fastball, setFastball] = useState("");
  const [popTime, setPopTime] = useState("");
  const [battingAvg, setBattingAvg] = useState("");
  const [spinRate, setSpinRate] = useState("");
  const [era, setEra] = useState("");
  const [pitches, setPitches] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [prefDivisions, setPrefDivisions] = useState<string[]>([]);
  const [prefStates, setPrefStates] = useState<string[]>([]);
  const [prefClimates, setPrefClimates] = useState<string[]>([]);
  const [prefSizes, setPrefSizes] = useState<string[]>([]);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const primary = picked[0] ?? null;
  // Detect roles across ALL picked positions so a two-way player (or a
  // pitcher picked second) still gets the right questions.
  const fielders = picked.filter((p) => !isPitcher(p));
  const hasPitch = picked.some(isPitcher);
  const hasHit = fielders.length > 0;
  const catcherAny = fielders.some(isCatcher);
  const outfielderAny = fielders.some(isOutfielder);

  // Position-player and pitching metrics live on their own steps; include
  // each only when it applies (two-way players see both).
  const PLAYER_STEPS = useMemo(
    () =>
      PLAYER_STEP_ORDER.filter((s) =>
        s === "hitting" ? hasHit : s === "pitching" ? hasPitch : true
      ),
    [hasHit, hasPitch]
  );
  const step = PLAYER_STEPS[i];
  const openNeedsRef = useRef<Need[] | null>(null);

  // On the teaser step, count how many open spots the player already matches.
  useEffect(() => {
    if (step !== "teaser") return;
    let active = true;
    setMatchCount(null);
    (async () => {
      let needs = openNeedsRef.current;
      if (!needs) {
        const { data } = await supabase
          .from("needs")
          .select(
            "positions, grad_year_min, grad_year_max, accepts_transfer, min_gpa"
          )
          .eq("status", "open");
        needs = (data ?? []) as unknown as Need[];
        openNeedsRef.current = needs;
      }
      const me = {
        positions: picked,
        grad_year: gradYear ? Number(gradYear) : null,
        is_transfer: isTransfer,
        gpa: gpa ? Number(gpa) : null,
      } as Player;
      const n = needs.filter((nd) => isEligible(me, nd)).length;
      if (active) setMatchCount(n);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Once saved, show the "getting things ready" handoff, then drop into
  // the Fits home screen with the welcome tour primed (?welcome=1).
  useEffect(() => {
    if (step !== "done") return;
    // Re-arm the welcome tour so it fires after every completed setup.
    try {
      localStorage.removeItem("athletx-tour-player");
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => {
      window.location.href = "/fits?welcome=1";
    }, 1400);
    return () => clearTimeout(t);
  }, [step]);

  const toggle = (set: typeof setPrefDivisions) => (v: string) =>
    set((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, k) => now + k - 1);
  }, []);

  function togglePos(pos: string) {
    setPicked((cur) =>
      cur.includes(pos) ? cur.filter((p) => p !== pos) : [...cur, pos]
    );
  }

  function canContinue(): boolean {
    switch (step) {
      case "name":
        return !!name.trim();
      case "positions":
        return picked.length > 0;
      case "class":
        return !!gradYear;
      case "location":
        return !!state;
      case "gpa": {
        const n = Number(gpa);
        return gpa !== "" && n >= 0 && n <= 6;
      }
      default:
        return true;
    }
  }

  function goNext() {
    if (!canContinue()) return;
    setError("");
    setI((k) => Math.min(k + 1, PLAYER_STEPS.length - 1));
  }
  function goBack() {
    setError("");
    setI((k) => Math.max(k - 1, 0));
  }
  // Intro is a 3-slide carousel before the questions start.
  function introNext() {
    if (introSlide < PLAYER_INTRO.length - 1) setIntroSlide((s) => s + 1);
    else goNext();
  }
  function handleBack() {
    if (step === "intro" && introSlide > 0) setIntroSlide((s) => s - 1);
    else goBack();
  }

  async function finish() {
    setError("");
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
        lat,
        lng,
        is_transfer: isTransfer,
        current_school: isTransfer ? currentSchool.trim() || null : null,
        sixty_yd: hasHit ? num(sixty) : null,
        exit_velo: hasHit ? num(exitVelo) : null,
        batting_avg: hasHit ? num(battingAvg) : null,
        inf_velo:
          hasHit && !catcherAny && !outfielderAny ? num(throwVelo) : null,
        of_velo: hasHit && outfielderAny && !catcherAny ? num(throwVelo) : null,
        fastball_velo: hasPitch ? num(fastball) : null,
        spin_rate: hasPitch ? num(spinRate) : null,
        era: hasPitch ? num(era) : null,
        pop_time: hasHit && catcherAny ? num(popTime) : null,
        pitches: hasPitch ? pitches : [],
        bio: bio.trim() || null,
        pref_divisions: prefDivisions,
        pref_states: prefStates,
        pref_climates: prefClimates,
        pref_sizes: prefSizes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    setSaving(false);
    if (pErr || plErr) {
      setError((pErr ?? plErr)?.message ?? "Something went wrong. Try again.");
      return;
    }
    setI(PLAYER_STEPS.indexOf("done"));
  }

  if (step === "done") return <Finishing label="Getting things ready…" />;

  const isIntro = step === "intro";
  const isAbout = step === "about";

  return (
    <main
      className="flex min-h-dvh flex-col px-6 pt-12"
      style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-4">
        {i > 0 || (isIntro && introSlide > 0) ? (
          <button onClick={handleBack} className="text-muted" aria-label="Back">
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
        ) : (
          <span className="w-[22px]" />
        )}
        <StepProgress
          total={PLAYER_STEPS.length}
          current={i + 1}
          className="flex-1"
        />
      </div>

      <div className="mt-8 flex-1">
        {step === "intro" && <PlayerIntro slide={introSlide} />}

        {step === "name" && (
          <div className="space-y-6">
            <QHead title="First, what's your name?" />
            <Field label="Full name" htmlFor="name">
              <Input
                id="name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && goNext()}
                placeholder="First Last"
              />
            </Field>
          </div>
        )}

        {step === "positions" && (
          <div className="space-y-6">
            <QHead
              title="What do you play?"
              sub="Tap all you play — your first pick is your primary (★)."
            />
            <div className="flex flex-wrap gap-2">
              {POSITIONS.map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => togglePos(pos)}
                  className={cn(
                    "h-10 rounded-pill px-4 text-sm font-semibold transition-colors",
                    picked.includes(pos)
                      ? "bg-accent text-surface"
                      : "bg-chip text-body-2 hover:bg-accent-soft"
                  )}
                >
                  {primary === pos ? `★ ${pos}` : pos}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "class" && (
          <div className="space-y-6">
            <QHead title="What's your class?" sub="Your graduation year." />
            <div className="flex flex-wrap gap-2">
              {years.map((y) => (
                <OptionPill
                  key={y}
                  active={gradYear === String(y)}
                  onClick={() => setGradYear(String(y))}
                >
                  {y}
                </OptionPill>
              ))}
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
          </div>
        )}

        {step === "location" && (
          <div className="space-y-6">
            <QHead
              title="Where are you from?"
              sub="Helps coaches gauge region and travel — and powers distance in your fits."
            />
            <CitySearch
              value={{ city, state, lat, lng }}
              onChange={(v) => {
                setCity(v.city);
                setState(v.state);
                setLat(v.lat);
                setLng(v.lng);
              }}
            />
          </div>
        )}

        {step === "gpa" && (
          <div className="space-y-6">
            <QHead title="What's your GPA?" sub="Weighted or unweighted — coaches filter on this." />
            <Field label="GPA" htmlFor="gpa">
              <Input
                id="gpa"
                type="number"
                step="0.01"
                min="0"
                max="6"
                inputMode="decimal"
                autoFocus
                placeholder="3.4"
                value={gpa}
                onChange={(e) => setGpa(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && goNext()}
              />
            </Field>
          </div>
        )}

        {step === "teaser" && (
          <div className="flex flex-col items-center justify-center pt-12 text-center">
            {matchCount == null ? (
              <p className="text-body-2">Finding your matches…</p>
            ) : matchCount > 0 ? (
              <>
                <div className="font-display text-[88px] font-bold leading-none text-accent tabular-nums">
                  {matchCount}
                </div>
                <h1 className="mt-3 text-2xl font-display font-bold tracking-tight">
                  open {matchCount === 1 ? "opportunity" : "opportunities"}{" "}
                  already {matchCount === 1 ? "fits" : "fit"} your profile
                </h1>
                <p className="mt-3 max-w-xs text-[15px] text-body-2">
                  Finish building your player profile, and we&rsquo;ll rank the
                  opportunities by best fit.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-display font-bold tracking-tight">
                  You&rsquo;re off to a strong start
                </h1>
                <p className="mt-3 max-w-xs text-[15px] text-body-2">
                  Add a few more details and we&rsquo;ll surface the
                  opportunities that fit you best.
                </p>
              </>
            )}
          </div>
        )}

        {step === "body" && (
          <div className="space-y-6">
            <QHead title="Your measurables" />
            <div className="flex flex-wrap gap-x-10 gap-y-5">
              {hasHit && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-body-2">Bats</p>
                  <div className="flex gap-2">
                    {BATS.map((b) => (
                      <OptionPill
                        key={b}
                        active={bats === b}
                        onClick={() => setBats(b)}
                      >
                        {b === "S" ? "Switch" : b === "R" ? "Right" : "Left"}
                      </OptionPill>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="mb-2 text-sm font-semibold text-body-2">Throws</p>
                <div className="flex gap-2">
                  {THROWS.map((t) => (
                    <OptionPill
                      key={t}
                      active={throws === t}
                      onClick={() => setThrows(t)}
                    >
                      {t === "R" ? "Right" : "Left"}
                    </OptionPill>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Height">
                <div className="flex gap-2">
                  <Input
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
            </div>
          </div>
        )}

        {step === "hitting" && (
          <div className="space-y-6">
            <QHead
              title="Position player metrics"
              sub="All optional — add what you've got, skip the rest."
            />
            <div className="grid grid-cols-2 gap-3">
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
              <Field label="60 time (sec)" htmlFor="sixty">
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
              {catcherAny ? (
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
              ) : (
                <Field
                  label={outfielderAny ? "OF velo (mph)" : "INF velo (mph)"}
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
              )}
              <Field label="Batting avg" htmlFor="ba">
                <Input
                  id="ba"
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  inputMode="decimal"
                  placeholder=".380"
                  value={battingAvg}
                  onChange={(e) => setBattingAvg(e.target.value)}
                />
              </Field>
            </div>
          </div>
        )}

        {step === "pitching" && (
          <div className="space-y-6">
            <QHead
              title="Pitching metrics"
              sub="All optional — add what you've got, skip the rest."
            />
            <div>
              <p className="mb-2 text-sm font-semibold text-body-2">
                Pitches you throw
              </p>
              <div className="flex flex-wrap gap-2">
                {PITCHES.map((p) => (
                  <OptionPill
                    key={p}
                    active={pitches.includes(p)}
                    onClick={() => toggle(setPitches)(p)}
                  >
                    {p}
                  </OptionPill>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
              <Field label="Spin rate (rpm)" htmlFor="spin">
                <Input
                  id="spin"
                  type="number"
                  inputMode="numeric"
                  placeholder="2200"
                  value={spinRate}
                  onChange={(e) => setSpinRate(e.target.value)}
                />
              </Field>
              <Field label="ERA" htmlFor="era">
                <Input
                  id="era"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="3.45"
                  value={era}
                  onChange={(e) => setEra(e.target.value)}
                />
              </Field>
            </div>
          </div>
        )}

        {step === "prefs" && (
          <div className="space-y-7">
            <QHead
              title="What are you looking for?"
              sub="All optional — it just sharpens your fits. Leave blank for everything."
            />

            <div>
              <p className="mb-2 text-sm font-semibold text-body-2">Levels</p>
              <div className="flex flex-wrap gap-2">
                {DIVISIONS.map((d) => (
                  <OptionPill
                    key={d}
                    active={prefDivisions.includes(d)}
                    onClick={() => toggle(setPrefDivisions)(d)}
                  >
                    {d}
                  </OptionPill>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-body-2">Weather</p>
              <div className="flex flex-wrap gap-2">
                {CLIMATES.map((c) => (
                  <OptionPill
                    key={c.value}
                    active={prefClimates.includes(c.value)}
                    onClick={() => toggle(setPrefClimates)(c.value)}
                  >
                    {c.label}
                  </OptionPill>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-body-2">
                School size
              </p>
              <div className="flex flex-wrap gap-2">
                {SIZES.filter((s) => s.value !== "any").map((s) => {
                  const active = prefSizes.includes(s.value);
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => toggle(setPrefSizes)(s.value)}
                      className={cn(
                        "flex flex-col items-start rounded-btn px-4 py-2 text-left transition-colors",
                        active
                          ? "bg-accent text-surface"
                          : "bg-chip text-body-2 hover:bg-accent-soft"
                      )}
                    >
                      <span className="text-sm font-semibold">{s.label}</span>
                      <span
                        className={cn(
                          "text-xs",
                          active ? "text-surface/80" : "text-muted-2"
                        )}
                      >
                        {s.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-body-2">
                Specific states{" "}
                <span className="font-normal text-muted-2">
                  (adds to the above)
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {STATES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggle(setPrefStates)(s)}
                    className={cn(
                      "h-8 rounded-pill px-2.5 text-xs font-semibold transition-colors",
                      prefStates.includes(s)
                        ? "bg-accent text-surface"
                        : "bg-chip text-body-2 hover:bg-accent-soft"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === "about" && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-display font-bold leading-snug tracking-tight">
                Tell coaches and recruiters who you are, where you&rsquo;re
                playing now, and why they should consider you for their
                opportunity.
              </h1>
              <p className="mt-3 text-[15px] text-body-2">
                4&ndash;5 sentences in your own words — then our platform will
                clean it up for you.
              </p>
            </div>
            <AboutYouAI
              value={bio}
              onChange={setBio}
              position={primary}
              gradYear={gradYear}
            />
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-4">
        {isAbout ? (
          <Button size="lg" full onClick={finish} disabled={saving}>
            {saving ? "Saving…" : "Finish & see my fits"}
            {!saving && <ArrowRight size={18} strokeWidth={2} aria-hidden />}
          </Button>
        ) : isIntro ? (
          <Button size="lg" full onClick={introNext}>
            {introSlide < PLAYER_INTRO.length - 1 ? "Next" : "Get started"}
            <ArrowRight size={18} strokeWidth={2} aria-hidden />
          </Button>
        ) : (
          <Button
            size="lg"
            full
            onClick={goNext}
            disabled={!canContinue()}
          >
            {step === "teaser" ? "Keep going" : "Continue"}
            <ArrowRight size={18} strokeWidth={2} aria-hidden />
          </Button>
        )}
      </div>
    </main>
  );
}

/* ---------------------- Coach onboarding wizard ------------------------- */

type CKey =
  | "intro"
  | "name"
  | "role"
  | "program"
  | "level"
  | "location"
  | "about"
  | "done";

const COACH_STEPS: CKey[] = [
  "intro",
  "name",
  "role",
  "program",
  "level",
  "location",
  "about",
  "done",
];

const STAFF_ROLES: { value: string; label: string }[] = [
  { value: "head", label: "Head coach" },
  { value: "assistant", label: "Assistant coach" },
  { value: "recruiting_coordinator", label: "Recruiting coordinator" },
];

function CoachWizard({
  userId,
  initialName,
}: {
  userId: string;
  initialName: string;
}) {
  const supabase = createClient();
  const [i, setI] = useState(0);
  const [name, setName] = useState(initialName);
  const [staffRole, setStaffRole] = useState("head");
  const [programName, setProgramName] = useState("");
  const [division, setDivision] = useState("");
  const [conference, setConference] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [about, setAbout] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const step = COACH_STEPS[i];

  useEffect(() => {
    if (step !== "done") return;
    try {
      localStorage.removeItem("athletx-tour-coach");
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => {
      window.location.href = "/inbox?welcome=1";
    }, 1400);
    return () => clearTimeout(t);
  }, [step]);

  function canContinue(): boolean {
    switch (step) {
      case "name":
        return !!name.trim();
      case "program":
        return !!programName.trim();
      case "level":
        return !!division;
      case "location":
        return !!state;
      default:
        return true;
    }
  }
  function goNext() {
    if (!canContinue()) return;
    setError("");
    setI((k) => Math.min(k + 1, COACH_STEPS.length - 1));
  }
  function goBack() {
    setError("");
    setI((k) => Math.max(k - 1, 0));
  }

  async function finish() {
    setError("");
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
        lat,
        lng,
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

    setSaving(false);
    if (pErr || staffErr) {
      setError((pErr ?? staffErr)?.message ?? "Something went wrong.");
      return;
    }
    setI(COACH_STEPS.indexOf("done"));
  }

  if (step === "done") return <Finishing label="Getting things ready…" />;

  const isIntro = step === "intro";
  const isAbout = step === "about";

  return (
    <main
      className="flex min-h-dvh flex-col px-6 pt-12"
      style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-4">
        {i > 0 ? (
          <button onClick={goBack} className="text-muted" aria-label="Back">
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
        ) : (
          <span className="w-[22px]" />
        )}
        <StepProgress
          total={COACH_STEPS.length}
          current={i + 1}
          className="flex-1"
        />
      </div>

      <div className="mt-8 flex-1">
        {step === "intro" && <HowItWorks role="coach" />}

        {step === "name" && (
          <div className="space-y-6">
            <QHead title="First, what's your name?" />
            <Field label="Full name" htmlFor="cname">
              <Input
                id="cname"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && goNext()}
                placeholder="First Last"
              />
            </Field>
          </div>
        )}

        {step === "role" && (
          <div className="space-y-6">
            <QHead title="What's your role?" />
            <div className="flex flex-wrap gap-2">
              {STAFF_ROLES.map((r) => (
                <OptionPill
                  key={r.value}
                  active={staffRole === r.value}
                  onClick={() => setStaffRole(r.value)}
                >
                  {r.label}
                </OptionPill>
              ))}
            </div>
          </div>
        )}

        {step === "program" && (
          <div className="space-y-6">
            <QHead
              title="What program do you coach?"
              sub="This is the name players see on your page."
            />
            <Field label="Program name" htmlFor="pname">
              <Input
                id="pname"
                autoFocus
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && goNext()}
                placeholder="Cowley College"
              />
            </Field>
          </div>
        )}

        {step === "level" && (
          <div className="space-y-6">
            <QHead title="What level do you play at?" />
            <div className="flex flex-wrap gap-2">
              {DIVISIONS.map((d) => (
                <OptionPill
                  key={d}
                  active={division === d}
                  onClick={() => setDivision(d)}
                >
                  {d}
                </OptionPill>
              ))}
            </div>
            <Field label="Conference" hint="Optional." htmlFor="conf">
              <Input
                id="conf"
                value={conference}
                onChange={(e) => setConference(e.target.value)}
                placeholder="KJCCC"
              />
            </Field>
          </div>
        )}

        {step === "location" && (
          <div className="space-y-6">
            <QHead
              title="Where's your program?"
              sub="Powers distance when a player sees your spots."
            />
            <CitySearch
              value={{ city, state, lat, lng }}
              onChange={(v) => {
                setCity(v.city);
                setState(v.state);
                setLat(v.lat);
                setLng(v.lng);
              }}
            />
          </div>
        )}

        {step === "about" && (
          <div className="space-y-6">
            <QHead
              title="Tell players about your program"
              sub="A line or two — optional, but it helps recruits picture the fit."
            />
            <Textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="JUCO contender with a strong four-year transfer pipeline…"
              maxLength={400}
              rows={5}
            />
          </div>
        )}

      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-4">
        {isAbout ? (
          <Button size="lg" full onClick={finish} disabled={saving}>
            {saving ? "Saving…" : "Finish & open my inbox"}
            {!saving && <ArrowRight size={18} strokeWidth={2} aria-hidden />}
          </Button>
        ) : (
          <Button size="lg" full onClick={goNext} disabled={!canContinue()}>
            {isIntro ? "Get started" : "Continue"}
            <ArrowRight size={18} strokeWidth={2} aria-hidden />
          </Button>
        )}
      </div>
    </main>
  );
}

