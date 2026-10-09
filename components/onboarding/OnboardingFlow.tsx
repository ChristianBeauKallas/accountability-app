"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Check, Film, Plus, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { BaseballIcon } from "@/components/ui/BaseballIcon";
import { Field, Input } from "@/components/ui/Field";
import { StepProgress } from "@/components/ui/ProgressBar";
import { AboutYouAI } from "@/components/onboarding/AboutYouAI";
import {
  POSITIONS,
  DIVISIONS,
  STATES,
  BATS,
  THROWS,
  PITCHES,
  PLAYER_LEVELS,
  isPitcher,
  isCatcher,
  isOutfielder,
} from "@/lib/constants";
import { CLIMATES } from "@/lib/climate";
import { isEligible } from "@/lib/fit";
import { CitySearch } from "@/components/onboarding/CitySearch";
import { SchoolSearch } from "@/components/onboarding/SchoolSearch";
import { ConferenceSearch } from "@/components/onboarding/ConferenceSearch";
import { FACILITY_GROUPS } from "@/components/onboarding/FacilityPicker";
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

// Normalize a pasted highlight link: add https:// if missing, and only return
// it if it looks like a real URL. Returns "" when it doesn't.
function normalizeUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withProto);
    return u.hostname.includes(".") ? u.toString() : "";
  } catch {
    return "";
  }
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
  | "media"
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
  "media",
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

// Two overlapping phones — e.g. the coach inbox with a player's profile in
// front of it, to show "tap a player, see their whole profile".
function DualPhonePreview({
  back,
  front,
  height,
}: {
  back: ScreenKey;
  front: ScreenKey;
  height: number;
}) {
  return (
    <div className="flex items-start justify-center">
      <div className="mt-8 -mr-12 opacity-95">
        <PhonePreview screen={back} height={height * 0.84} />
      </div>
      <div className="relative z-10 drop-shadow-[0_12px_30px_rgba(0,0,0,0.5)]">
        <PhonePreview screen={front} height={height} />
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
  const [settingUp, setSettingUp] = useState(false);
  const [name, setName] = useState(initialName);
  const [picked, setPicked] = useState<string[]>([]);
  const [gradYear, setGradYear] = useState("");
  // Where the player currently is: "high_school" | "juco" | "four_year".
  const [level, setLevel] = useState<string>("high_school");
  const [currentSchool, setCurrentSchool] = useState("");
  const isTransfer = level !== "high_school";
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
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [highlightUrl, setHighlightUrl] = useState("");
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function onAvatarPick(file: File | null) {
    if (!file) return;
    setError("");
    if (file.size > 10 * 1024 * 1024) {
      setError("Photo is over 10MB — try a smaller image.");
      return;
    }
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/avatar/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("player-media")
      .upload(path, file, { upsert: true });
    if (upErr) {
      setUploadingAvatar(false);
      setError(upErr.message);
      return;
    }
    setAvatarUrl(
      supabase.storage.from("player-media").getPublicUrl(path).data.publicUrl
    );
    setUploadingAvatar(false);
  }

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
            "positions, grad_year_min, grad_year_max, accepts_transfer, player_types, min_gpa"
          )
          .eq("status", "open");
        needs = (data ?? []) as unknown as Need[];
        openNeedsRef.current = needs;
      }
      const me = {
        positions: picked,
        grad_year: gradYear ? Number(gradYear) : null,
        is_transfer: isTransfer,
        level,
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
    else setSettingUp(true); // hand off to profile setup with a beat
  }
  // After the carousel, a short "Let's set up your profile" transition
  // before the first question, so it's obvious we've switched to setup.
  useEffect(() => {
    if (!settingUp) return;
    const t = setTimeout(() => {
      setSettingUp(false);
      goNext();
    }, 1500);
    return () => clearTimeout(t);
  }, [settingUp]); // eslint-disable-line react-hooks/exhaustive-deps
  function handleBack() {
    if (step === "intro" && introSlide > 0) setIntroSlide((s) => s - 1);
    else goBack();
  }

  async function finish() {
    setError("");
    setSaving(true);
    const totalHeight =
      heightFt || heightIn
        ? Math.round(Number(heightFt || 0) * 12 + Number(heightIn || 0))
        : null;

    const toNum = (v: string) => {
      const n = Number(v);
      return v.trim() === "" || Number.isNaN(n) ? null : n;
    };
    const toInt = (v: string) => {
      const n = toNum(v);
      return n == null ? null : Math.round(n);
    };

    // Decimal metrics: validate sane ranges so a mistyped value (like a
    // missing decimal point on a 60 time) shows a friendly message instead
    // of a database error.
    const sixtyN = hasHit ? toNum(sixty) : null;
    const popN = hasHit && catcherAny ? toNum(popTime) : null;
    const avgN = hasHit ? toNum(battingAvg) : null;
    const eraN = hasPitch ? toNum(era) : null;
    const ranges: [number | null, number, number, string][] = [
      [sixtyN, 3, 30, "Enter your 60 time in seconds — like 6.85."],
      [popN, 1, 5, "Enter your pop time in seconds — like 1.95."],
      [avgN, 0, 1, "Batting average should be between 0 and 1 — like .380."],
      [eraN, 0, 99.99, "Double-check your ERA — like 3.45."],
    ];
    for (const [val, min, max, msg] of ranges) {
      if (val != null && (val < min || val > max)) {
        setError(msg);
        setSaving(false);
        return;
      }
    }

    const { error: pErr } = await supabase
      .from("profiles")
      .update({
        full_name: name.trim(),
        onboarded: true,
        avatar_url: avatarUrl || null,
      })
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
        weight_lb: toInt(weight),
        gpa: toNum(gpa),
        city: city.trim() || null,
        state: state || null,
        lat,
        lng,
        is_transfer: isTransfer,
        level,
        current_school: isTransfer ? currentSchool.trim() || null : null,
        sixty_yd: sixtyN,
        exit_velo: hasHit ? toInt(exitVelo) : null,
        batting_avg: avgN,
        inf_velo:
          hasHit && !catcherAny && !outfielderAny ? toInt(throwVelo) : null,
        of_velo: hasHit && outfielderAny && !catcherAny ? toInt(throwVelo) : null,
        fastball_velo: hasPitch ? toInt(fastball) : null,
        spin_rate: hasPitch ? toInt(spinRate) : null,
        era: eraN,
        pop_time: popN,
        pitches: hasPitch ? pitches : [],
        bio: bio.trim() || null,
        pref_divisions: prefDivisions,
        pref_states: prefStates,
        pref_climates: prefClimates,
        pref_sizes: prefSizes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    // Save a highlight link as the player's first highlight post so it shows
    // on their profile. Fire-and-forget — never block finishing onboarding.
    const hl = normalizeUrl(highlightUrl);
    if (hl) {
      void supabase.from("player_posts").insert({
        player_id: userId,
        kind: "highlight",
        media_type: "video",
        media_url: hl,
      });
    }

    setSaving(false);
    if (pErr || plErr) {
      setError((pErr ?? plErr)?.message ?? "Something went wrong. Try again.");
      return;
    }
    setI(PLAYER_STEPS.indexOf("done"));
  }

  if (step === "done") return <Finishing label="Getting things ready…" />;
  if (settingUp) return <Finishing label="Let's set up your profile" />;

  const isIntro = step === "intro";
  const isAbout = step === "about";
  // Progress bar: the intro carousel gets its own 3-part track; once profile
  // setup begins it resets to count the real setup steps.
  const pSetupSteps = PLAYER_STEPS.filter((s) => s !== "intro" && s !== "done");
  const progressTotal = isIntro ? PLAYER_INTRO.length : pSetupSteps.length;
  const progressCurrent = isIntro
    ? introSlide + 1
    : Math.max(pSetupSteps.indexOf(step) + 1, 1);

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
          total={progressTotal}
          current={progressCurrent}
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
            <QHead
              title="Where are you now?"
              sub="This is how coaches know who they're recruiting."
            />
            <div className="space-y-2">
              {PLAYER_LEVELS.map((lvl) => {
                const active = level === lvl.value;
                return (
                  <button
                    key={lvl.value}
                    type="button"
                    onClick={() => setLevel(lvl.value)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-input border p-4 text-left transition-colors",
                      active
                        ? "border-accent bg-accent-soft"
                        : "border-border bg-surface hover:bg-chip"
                    )}
                  >
                    <span className="text-[15px] font-semibold text-ink">
                      {lvl.self}
                    </span>
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border",
                        active ? "border-accent bg-accent text-surface" : "border-border"
                      )}
                    >
                      {active && <span className="text-xs font-bold">✓</span>}
                    </span>
                  </button>
                );
              })}
            </div>

            <div>
              <p className="eyebrow mb-2">
                {isTransfer ? "Graduation year" : "Your class"}
              </p>
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
            </div>

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
              <Field label="60 time (sec)" htmlFor="sixty" hint="In seconds">
                <Input
                  id="sixty"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="6.85"
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

        {step === "media" && (
          <div className="space-y-7">
            <QHead
              title="Add a photo and your highlights"
              sub="Optional — but a face and a highlight link get you noticed faster."
            />
            <div>
              <p className="mb-2 text-sm font-semibold text-body-2">
                Profile photo
              </p>
              <div className="flex items-center gap-4">
                <Avatar name={name || "You"} src={avatarUrl || null} size={72} />
                <div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-btn border border-border bg-surface px-3 py-2 text-sm font-semibold text-ink">
                    <Camera size={16} strokeWidth={2} aria-hidden />
                    {uploadingAvatar
                      ? "Uploading…"
                      : avatarUrl
                        ? "Change photo"
                        : "Add photo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        onAvatarPick(e.target.files?.[0] ?? null)
                      }
                    />
                  </label>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl("")}
                      className="ml-3 text-sm font-semibold text-danger"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <Field
              label="Highlight video"
              hint="Paste a link — Hudl, YouTube, X, Instagram…"
              htmlFor="hl"
            >
              <Input
                id="hl"
                value={highlightUrl}
                onChange={(e) => setHighlightUrl(e.target.value)}
                placeholder="hudl.com/… or youtube.com/…"
                inputMode="url"
                autoCapitalize="off"
                autoComplete="off"
              />
            </Field>

            <p className="flex items-center gap-1.5 text-xs text-muted-2">
              <Film size={14} strokeWidth={2} aria-hidden />
              You can add more photos and clips anytime from your profile.
            </p>
          </div>
        )}

        {step === "about" && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-display font-bold leading-snug tracking-tight">
                Your bio — who you are and why coaches should take a look.
              </h1>
              <p className="mt-3 text-[15px] text-body-2">
                Tap <span className="font-semibold text-ink">Generate</span> and
                we&rsquo;ll draft it from everything you just entered — then edit
                it however you like. Or write your own.
              </p>
            </div>
            <AboutYouAI
              value={bio}
              onChange={setBio}
              position={primary}
              gradYear={gradYear}
              generateFields={{
                name,
                gradYear,
                isTransfer,
                currentSchool: isTransfer ? currentSchool : "",
                primary,
                positions: picked,
                city,
                state,
                heightIn:
                  (Number(heightFt) || 0) * 12 + (Number(heightIn) || 0) ||
                  undefined,
                weightLb: weight,
                bats: hasHit ? bats : "",
                throws,
                gpa,
                sixty,
                exitVelo: hasHit ? exitVelo : "",
                battingAvg: hasHit ? battingAvg : "",
                infVelo:
                  hasHit && !catcherAny && !outfielderAny ? throwVelo : "",
                ofVelo: hasHit && outfielderAny && !catcherAny ? throwVelo : "",
                popTime: catcherAny ? popTime : "",
                fastball: hasPitch ? fastball : "",
                spinRate: hasPitch ? spinRate : "",
                era: hasPitch ? era : "",
                pitches: hasPitch ? pitches : [],
              }}
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

/* -------------------- Coach intro carousel (3 steps) -------------------- */

const COACH_INTRO: {
  screen: ScreenKey;
  screen2?: ScreenKey;
  title: string;
  body: string;
}[] = [
  {
    screen: "needs",
    title: "Recruit to your roster needs",
    body: "Create specific, targeted posts for the exact positions your roster needs — they land in front of the players who actually fit.",
  },
  {
    screen: "inbox",
    title: "See who fits, first",
    body: "You'll connect with players who show interest in your open roster needs — no need to filter through the noise.",
  },
  {
    screen: "inbox-mutual",
    screen2: "profile",
    title: "Reach out on your terms",
    body: "Review every player in your inbox and mark interest in only the ones you want to connect with.",
  },
];

function CoachIntro({ slide }: { slide: number }) {
  const s = COACH_INTRO[slide];
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
          {s.screen2 ? (
            <DualPhonePreview back={s.screen} front={s.screen2} height={404} />
          ) : (
            <PhonePreview screen={s.screen} height={436} />
          )}
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-2">
        {COACH_INTRO.map((_, k) => (
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

/* ---------------------- Coach onboarding wizard ------------------------- */

type CKey =
  | "intro"
  | "name"
  | "role"
  | "program"
  | "about"
  | "media"
  | "done";

const COACH_STEPS: CKey[] = [
  "intro",
  "name",
  "program",
  "role",
  "about",
  "media",
  "done",
];

const STAFF_ROLES: { value: string; label: string }[] = [
  { value: "head", label: "Head coach" },
  { value: "assistant", label: "Assistant coach" },
  { value: "recruiting_coordinator", label: "Recruiting coordinator" },
  { value: "team_admin", label: "Team admin" },
  { value: "athletic_director", label: "Athletic director" },
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
  const [introSlide, setIntroSlide] = useState(0);
  const [settingUp, setSettingUp] = useState(false);
  const [name, setName] = useState(initialName);
  const [staffRole, setStaffRole] = useState("head");
  const [programName, setProgramName] = useState("");
  const [division, setDivision] = useState("");
  const [conference, setConference] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [schoolPicked, setSchoolPicked] = useState(false);
  // True once a school is committed (picked from the list or added as new),
  // which reveals the inline location picker in the program step.
  const [schoolChosen, setSchoolChosen] = useState(false);
  const [about, setAbout] = useState("");
  const [facilities, setFacilities] = useState<string[]>([]);
  // The "about" step is a mini questionnaire: intro → spinner → one category
  // of value-adds per screen → spinner → generated description to review.
  const [aboutPhase, setAboutPhase] = useState<
    "intro" | "spinQ" | "cats" | "spinGen" | "review"
  >("intro");
  const [catIndex, setCatIndex] = useState(0);
  const [customTag, setCustomTag] = useState("");
  const [genNote, setGenNote] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [facilityPhotos, setFacilityPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Program media reuses the public player-media bucket (per migration 0007).
  async function uploadImage(file: File, kind: string): Promise<string | null> {
    if (file.size > 10 * 1024 * 1024) {
      setError("Image is over 10MB — try a smaller one.");
      return null;
    }
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${kind}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("player-media")
      .upload(path, file, { upsert: true });
    if (upErr) {
      setError(upErr.message);
      return null;
    }
    return supabase.storage.from("player-media").getPublicUrl(path).data
      .publicUrl;
  }

  async function onLogoPick(file: File | null) {
    if (!file) return;
    setError("");
    setUploadingLogo(true);
    const url = await uploadImage(file, "logo");
    if (url) setLogoUrl(url);
    setUploadingLogo(false);
  }

  async function onFacilityPhotoPick(file: File | null) {
    if (!file) return;
    setError("");
    setUploadingPhoto(true);
    const url = await uploadImage(file, "facility");
    if (url) setFacilityPhotos((cur) => [...cur, url]);
    setUploadingPhoto(false);
  }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const step = COACH_STEPS[i];

  useEffect(() => {
    if (step !== "done") return;
    try {
      // Let both the program walkthrough and the inbox tour run.
      localStorage.removeItem("athletx-tour-coach");
      localStorage.removeItem("athletx-tour-coach-program");
    } catch {
      /* ignore */
    }
    // Land on their freshly-built program page first so they see what they
    // made; the program walkthrough then leads into posting their first need.
    const t = setTimeout(() => {
      window.location.href = "/program?welcome=1";
    }, 1400);
    return () => clearTimeout(t);
  }, [step]);

  function canContinue(): boolean {
    switch (step) {
      case "name":
        return !!name.trim();
      case "program":
        return (
          !!programName.trim() && !!state && !!division && !!conference.trim()
        );
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
  function introNext() {
    if (introSlide < COACH_INTRO.length - 1) setIntroSlide((s) => s + 1);
    else setSettingUp(true); // hand off to profile setup with a beat
  }
  // After the carousel, a short "Let's set up your profile" transition
  // before the first question, so it's obvious we've switched to setup.
  useEffect(() => {
    if (!settingUp) return;
    const t = setTimeout(() => {
      setSettingUp(false);
      goNext();
    }, 1500);
    return () => clearTimeout(t);
  }, [settingUp]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- "About" questionnaire helpers ----
  const facKey = (s: string) => s.trim().toLowerCase();
  function toggleFacility(name: string) {
    const k = facKey(name);
    setFacilities((cur) =>
      cur.some((v) => facKey(v) === k)
        ? cur.filter((v) => facKey(v) !== k)
        : [...cur, name]
    );
  }
  function addCustomTag() {
    const parts = customTag
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    setFacilities((cur) => {
      const have = new Set(cur.map(facKey));
      const next = [...cur];
      for (const p of parts)
        if (!have.has(facKey(p))) {
          have.add(facKey(p));
          next.push(p);
        }
      return next;
    });
    setCustomTag("");
  }
  async function generateProgram() {
    try {
      const res = await fetch("/api/ai/bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "program",
          generate: true,
          programName,
          division,
          conference,
          facilities,
          text: about.trim() || undefined,
        }),
      });
      if (res.status === 503) {
        setGenNote("AI isn't set up yet — write your own below.");
        return;
      }
      if (!res.ok) {
        setGenNote("Couldn't draft that — add or edit below.");
        return;
      }
      const data = (await res.json()) as { text?: string };
      if (data.text) {
        setAbout(data.text);
        setGenNote("Drafted from your answers ✨ — edit anything.");
      }
    } catch {
      setGenNote("Couldn't draft that — add or edit below.");
    }
  }
  // "Getting questions ready" beat → first category.
  useEffect(() => {
    if (aboutPhase !== "spinQ") return;
    const t = setTimeout(() => {
      setCatIndex(0);
      setAboutPhase("cats");
    }, 1200);
    return () => clearTimeout(t);
  }, [aboutPhase]);
  // "Developing your profile" → fire the generator, then show the draft.
  useEffect(() => {
    if (aboutPhase !== "spinGen") return;
    let active = true;
    (async () => {
      setGenNote("");
      await generateProgram();
      if (active) setAboutPhase("review");
    })();
    return () => {
      active = false;
    };
  }, [aboutPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleBack() {
    if (step === "intro" && introSlide > 0) setIntroSlide((s) => s - 1);
    else if (step === "about") {
      if (aboutPhase === "review") {
        setCatIndex(FACILITY_GROUPS.length - 1);
        setAboutPhase("cats");
      } else if (aboutPhase === "cats") {
        if (catIndex > 0) setCatIndex((i) => i - 1);
        else setAboutPhase("intro");
      } else if (aboutPhase === "intro") goBack();
      // spinners have no back
    } else goBack();
  }

  async function finish() {
    setError("");
    setSaving(true);

    const { error: pErr } = await supabase
      .from("profiles")
      .update({ full_name: name.trim(), onboarded: true })
      .eq("id", userId);

    // Join an existing program for this school if one already exists (same
    // name + state) so two coaches from the same school land on ONE program
    // instead of creating duplicates. Otherwise create it.
    const schoolName = programName.trim();
    let programId: string | null = null;

    let lookup = supabase
      .from("programs")
      .select("id")
      .ilike("name", schoolName);
    if (state) lookup = lookup.eq("state", state);
    const { data: existing } = await lookup.limit(1);

    if (existing && existing.length > 0) {
      programId = existing[0].id;
    } else {
      const { data: program, error: progErr } = await supabase
        .from("programs")
        .insert({
          name: schoolName,
          division,
          city: city.trim() || null,
          state,
          lat,
          lng,
          conference: conference.trim() || null,
          about: about.trim() || null,
          logo_url: logoUrl || null,
        })
        .select("id")
        .single();

      if (progErr || !program) {
        setSaving(false);
        setError(progErr?.message ?? "Couldn't create your program. Try again.");
        return;
      }
      programId = program.id;
    }

    // Crowdsource the school + conference into the shared reference tables so
    // the next coach can pick them. Fire-and-forget — never block onboarding,
    // and duplicates are ignored at the DB level.
    if (schoolName) {
      void supabase
        .from("schools")
        .upsert(
          {
            name: schoolName,
            city: city.trim() || null,
            state: state || null,
            lat,
            lng,
          },
          { onConflict: "name_key,state_key", ignoreDuplicates: true }
        );
    }
    const confName = conference.trim();
    if (confName && division) {
      void supabase
        .from("conferences")
        .upsert(
          { name: confName, division },
          { onConflict: "name_key,division", ignoreDuplicates: true }
        );
    }
    // Crowdsource any facility tags the coach added so others can pick them.
    const newFacilities = facilities
      .map((f) => f.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
    if (newFacilities.length) {
      void supabase
        .from("facilities")
        .upsert(newFacilities, {
          onConflict: "name_key",
          ignoreDuplicates: true,
        });
    }

    // Add this coach to the program (ignore if they're already on it).
    const { error: staffErr } = await supabase.from("program_staff").upsert(
      {
        program_id: programId,
        profile_id: userId,
        staff_role: staffRole,
      },
      { onConflict: "program_id,profile_id", ignoreDuplicates: true }
    );

    // Post facility photos to the program page (RLS needs staff, set above).
    if (!staffErr && facilityPhotos.length) {
      void supabase.from("program_posts").insert(
        facilityPhotos.map((url) => ({
          program_id: programId,
          kind: "facility",
          media_url: url,
          media_type: "image",
        }))
      );
    }

    setSaving(false);
    if (pErr || staffErr) {
      setError((pErr ?? staffErr)?.message ?? "Something went wrong.");
      return;
    }
    setI(COACH_STEPS.indexOf("done"));
  }

  if (step === "done") return <Finishing label="Getting things ready…" />;
  if (settingUp) return <Finishing label="Let's set up your profile" />;
  if (step === "about" && aboutPhase === "spinQ")
    return <Finishing label="Getting questions ready…" />;
  if (step === "about" && aboutPhase === "spinGen")
    return <Finishing label="Developing your profile…" />;

  const isIntro = step === "intro";
  const isAbout = step === "about";
  const isMedia = step === "media"; // last input step — holds the finish CTA
  // Intro carousel gets its own 3-part track; profile setup resets it.
  const cSetupSteps = COACH_STEPS.filter((s) => s !== "intro" && s !== "done");
  const progressTotal = isIntro ? COACH_INTRO.length : cSetupSteps.length;
  const progressCurrent = isIntro
    ? introSlide + 1
    : Math.max(cSetupSteps.indexOf(step) + 1, 1);

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
          total={progressTotal}
          current={progressCurrent}
          className="flex-1"
        />
      </div>

      <div className="mt-8 flex-1">
        {step === "intro" && <CoachIntro slide={introSlide} />}

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
            <QHead
              title={
                programName.trim()
                  ? `What's your role on ${programName.trim()}'s staff?`
                  : "What's your role?"
              }
            />
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
              title="What school or institution do you coach for?"
              sub="This is the name players see on your page."
            />
            <Field label="School / institution" htmlFor="pname">
              <SchoolSearch
                value={programName}
                onChange={(v) => {
                  setProgramName(v);
                  // Editing the name re-opens the search: forget the chosen
                  // school and drop any prefilled location/level so we don't
                  // carry the wrong details forward.
                  setSchoolChosen(false);
                  if (schoolPicked) {
                    setDivision("");
                    setConference("");
                  }
                  if (schoolPicked || city || state) {
                    setCity("");
                    setState("");
                    setLat(null);
                    setLng(null);
                    setSchoolPicked(false);
                  }
                }}
                onPick={(s) => {
                  setProgramName(s.name);
                  setCity(s.city ?? "");
                  setState(s.state ?? "");
                  setLat(s.lat);
                  setLng(s.lng);
                  // Pre-fill level + conference from the school record; the
                  // coach can still change them on the level step.
                  if (s.division) setDivision(s.division);
                  if (s.conference) setConference(s.conference);
                  setSchoolPicked(true);
                  setSchoolChosen(true);
                }}
                onAddNew={() => {
                  // New school — start its location blank for the coach to set.
                  setCity("");
                  setState("");
                  setLat(null);
                  setLng(null);
                  setSchoolPicked(false);
                  setSchoolChosen(true);
                }}
              />
            </Field>

            {schoolChosen && (
              <div>
                <p className="mb-1.5 text-sm font-medium text-body-2">
                  Where is {programName.trim() || "your school"}?
                </p>
                <CitySearch
                  key={`${programName}|${schoolPicked ? "picked" : "new"}`}
                  value={{ city, state, lat, lng }}
                  onChange={(v) => {
                    setCity(v.city);
                    setState(v.state);
                    setLat(v.lat);
                    setLng(v.lng);
                  }}
                />
                <p className="mt-2 text-xs text-muted-2">
                  This helps us match you with players nearby.
                </p>
              </div>
            )}

            {schoolChosen && (
              <div>
                <p className="mb-1.5 text-sm font-medium text-body-2">
                  What level do they compete at?
                </p>
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
                <div className="mt-4">
                  <p className="mb-1.5 text-sm font-medium text-body-2">
                    Conference
                  </p>
                  <ConferenceSearch
                    division={division}
                    value={conference}
                    onChange={setConference}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {step === "about" && aboutPhase === "intro" && (
          <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-pill bg-accent-soft text-accent">
              <BaseballIcon size={30} strokeWidth={2} aria-hidden />
            </div>
            <h1 className="text-[28px] leading-tight font-display font-bold tracking-tight">
              Let&rsquo;s build your program&rsquo;s page
            </h1>
            <p className="mt-2 max-w-sm text-body-2">
              We&rsquo;ll ask a few quick questions about your program, then draft
              your description for you — you can edit it or write your own.
            </p>
          </div>
        )}

        {step === "about" && aboutPhase === "cats" && (
          <div className="space-y-6">
            <QHead
              title="What makes your program stand out?"
              sub="Tap all that apply — or add your own. These help us draft your description."
            />
            <div className="flex justify-center gap-2">
              {FACILITY_GROUPS.map((_, k) => (
                <span
                  key={k}
                  className={
                    "h-1.5 rounded-pill transition-all " +
                    (k === catIndex ? "w-6 bg-accent" : "w-1.5 bg-border")
                  }
                />
              ))}
            </div>
            <div>
              <p className="eyebrow mb-2">{FACILITY_GROUPS[catIndex].label}</p>
              <div className="flex flex-wrap gap-2">
                {FACILITY_GROUPS[catIndex].items.map((name) => {
                  const active = facilities.some(
                    (v) => v.trim().toLowerCase() === name.toLowerCase()
                  );
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleFacility(name)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-pill px-3.5 py-2 text-sm font-semibold transition-colors",
                        active
                          ? "bg-accent text-surface"
                          : "bg-chip text-body-2 hover:bg-accent-soft"
                      )}
                    >
                      {active && <Check size={14} strokeWidth={2.5} aria-hidden />}
                      {name}
                    </button>
                  );
                })}
                {/* Custom tags the coach added (not in any built-in group). */}
                {facilities
                  .filter(
                    (f) =>
                      !FACILITY_GROUPS.some((g) =>
                        g.items.some(
                          (i) =>
                            i.toLowerCase() === f.trim().toLowerCase()
                        )
                      )
                  )
                  .map((name) => (
                    <button
                      key={`custom-${name}`}
                      type="button"
                      onClick={() => toggleFacility(name)}
                      className="inline-flex items-center gap-1.5 rounded-pill bg-accent px-3.5 py-2 text-sm font-semibold text-surface"
                    >
                      <Check size={14} strokeWidth={2.5} aria-hidden />
                      {name}
                    </button>
                  ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addCustomTag();
                  }
                }}
                placeholder="Add your own…"
                autoCapitalize="words"
              />
              <button
                type="button"
                onClick={addCustomTag}
                disabled={!customTag.trim()}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-input bg-accent-soft text-accent disabled:opacity-50"
                aria-label="Add"
              >
                <Plus size={18} strokeWidth={2.5} aria-hidden />
              </button>
            </div>
          </div>
        )}

        {step === "about" && aboutPhase === "review" && (
          <div className="space-y-5">
            <QHead
              title="Here's your program description"
              sub="Drafted from your answers — edit it, polish it, or write your own."
            />
            <AboutYouAI
              mode="program"
              value={about}
              onChange={setAbout}
              programName={programName}
              division={division}
              conference={conference}
              facilities={facilities}
            />
          </div>
        )}

        {step === "media" && (
          <div className="space-y-7">
            <QHead
              title="Finish up with your branding and facility photos"
              sub="Add your logo and a few facility photos so recruits can picture themselves there — or add them later from your Program page."
            />

            <div>
              <p className="mb-2 text-sm font-semibold text-body-2">
                Program logo
              </p>
              <div className="flex items-center gap-4">
                <Avatar name={programName || "Program"} src={logoUrl || null} size={72} />
                <div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-btn border border-border bg-surface px-3 py-2 text-sm font-semibold text-ink">
                    <Camera size={16} strokeWidth={2} aria-hidden />
                    {uploadingLogo
                      ? "Uploading…"
                      : logoUrl
                        ? "Change logo"
                        : "Add logo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        onLogoPick(e.target.files?.[0] ?? null)
                      }
                    />
                  </label>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl("")}
                      className="ml-3 text-sm font-semibold text-danger"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-body-2">
                Facility photos
              </p>
              <div className="flex flex-wrap gap-2.5">
                {facilityPhotos.map((url, k) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <div key={url} className="relative h-20 w-20">
                    <img
                      src={url}
                      alt=""
                      className="h-20 w-20 rounded-input object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFacilityPhotos((cur) =>
                          cur.filter((_, i) => i !== k)
                        )
                      }
                      className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-pill bg-ink text-ground"
                      aria-label="Remove photo"
                    >
                      <X size={13} strokeWidth={2.5} aria-hidden />
                    </button>
                  </div>
                ))}
                <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-input border border-dashed border-border bg-surface text-muted-2">
                  {uploadingPhoto ? (
                    <span className="text-xs">Uploading…</span>
                  ) : (
                    <>
                      <Camera size={18} strokeWidth={2} aria-hidden />
                      <span className="text-xs font-semibold">Add</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      onFacilityPhotoPick(e.target.files?.[0] ?? null)
                    }
                  />
                </label>
              </div>
            </div>

            <p className="flex items-center gap-1.5 text-xs text-muted-2">
              <Film size={14} strokeWidth={2} aria-hidden />
              Optional — you can add more anytime from your Program page.
            </p>
          </div>
        )}

      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-4">
        {isMedia ? (
          <div className="space-y-2">
            <Button size="lg" full onClick={finish} disabled={saving}>
              {saving ? "Saving…" : "Finish & see my page"}
              {!saving && <ArrowRight size={18} strokeWidth={2} aria-hidden />}
            </Button>
            {!saving && (
              <button
                type="button"
                onClick={finish}
                className="w-full py-1 text-center text-sm font-semibold text-muted-2"
              >
                Skip for now — add these after the tour
              </button>
            )}
          </div>
        ) : isIntro ? (
          <Button size="lg" full onClick={introNext}>
            {introSlide < COACH_INTRO.length - 1 ? "Next" : "Get started"}
            <ArrowRight size={18} strokeWidth={2} aria-hidden />
          </Button>
        ) : isAbout ? (
          aboutPhase === "intro" ? (
            <Button size="lg" full onClick={() => setAboutPhase("spinQ")}>
              Next
              <ArrowRight size={18} strokeWidth={2} aria-hidden />
            </Button>
          ) : aboutPhase === "cats" ? (
            <Button
              size="lg"
              full
              onClick={() =>
                catIndex < FACILITY_GROUPS.length - 1
                  ? setCatIndex((i) => i + 1)
                  : setAboutPhase("spinGen")
              }
            >
              {catIndex < FACILITY_GROUPS.length - 1
                ? "Next"
                : "Build my page"}
              <ArrowRight size={18} strokeWidth={2} aria-hidden />
            </Button>
          ) : (
            <Button size="lg" full onClick={goNext}>
              I like it
              <ArrowRight size={18} strokeWidth={2} aria-hidden />
            </Button>
          )
        ) : (
          <Button size="lg" full onClick={goNext} disabled={!canContinue()}>
            Continue
            <ArrowRight size={18} strokeWidth={2} aria-hidden />
          </Button>
        )}
      </div>
    </main>
  );
}

