"use client";

import { useEffect, useState } from "react";
import { RunnerMark } from "./Runner";

export const TOUR_KEY = "wlns_tour_done";

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

type Spot = "feed" | "log" | "profile";
const STEPS: { spot: Spot; title: string; body: string }[] = [
  {
    spot: "feed",
    title: "Your team feed",
    body: "This is where you track your teammates' progress, cheer people on, and see what everyone's done today.",
  },
  {
    spot: "log",
    title: "Log your activity",
    body: "Tap the + to check in — add a photo, tag your location, note what you did, and Post. Each one gets you closer to your incentive.",
  },
  {
    spot: "profile",
    title: "Your progress",
    body: "Track your month here: qualifying days, wellness hours banked, cash earned, and your full check-in history.",
  },
];

export function FeedTutorial() {
  const [phase, setPhase] = useState<"hidden" | "intro" | number>("hidden");

  useEffect(() => {
    try {
      if (!localStorage.getItem(TOUR_KEY)) setPhase("intro");
    } catch {
      /* ignore */
    }
  }, []);

  function finish() {
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {
      /* ignore */
    }
    setPhase("hidden");
  }

  if (phase === "hidden") return null;

  if (phase === "intro") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-8">
        <div className="w-full max-w-[320px] rounded-card bg-surface p-6 text-center shadow-card">
          <RunnerMark tile={56} icon={28} radius={16} className="mx-auto" bob />
          <h3 className="mt-4 font-display text-xl font-bold text-ink">Let&apos;s show you around</h3>
          <p className="mt-1.5 text-sm text-body-2">A quick tour of the app — about 30 seconds.</p>
          <button
            onClick={() => setPhase(0)}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-cta bg-accent font-display font-semibold text-surface"
          >
            Start tutorial
          </button>
          <button onClick={finish} className="mt-2 w-full p-1.5 text-sm font-semibold text-muted">
            Skip
          </button>
        </div>
      </div>
    );
  }

  const step = phase as number;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  const navItem = (spot: Spot, label: string, icon: React.ReactNode, fab = false) => {
    const on = s.spot === spot;
    if (fab) {
      return (
        <span className="flex-none">
          <span
            className={`-mt-4 grid h-[50px] w-[50px] place-items-center rounded-[16px] bg-accent text-surface transition ${on ? "scale-110 ring-4 ring-accent/40" : "opacity-40"}`}
          >
            {icon}
          </span>
        </span>
      );
    }
    return (
      <span className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] font-semibold transition ${on ? "scale-110 text-accent" : "text-muted opacity-40"}`}>
        {icon}
        {label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/75" />

      {/* tooltip card above the nav */}
      <div className="absolute inset-x-0 bottom-[88px] px-5">
        <div className="mx-auto max-w-[360px] rounded-card bg-surface p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <span key={i} className={`h-1.5 w-1.5 rounded-full ${i <= step ? "bg-accent" : "bg-track"}`} />
              ))}
            </div>
            <button onClick={finish} className="text-[0.72rem] font-semibold text-muted">
              Skip
            </button>
          </div>

          {step === 1 && <LogPreview />}
          {step === 2 && <ProfilePreview />}

          <h3 className="mt-3 font-display text-lg font-bold text-ink">{s.title}</h3>
          <p className="mt-1 text-[0.86rem] leading-snug text-body-2">{s.body}</p>

          <div className="mt-4 flex items-center gap-2.5">
            {step > 0 && (
              <button
                onClick={() => setPhase(step - 1)}
                className="h-11 rounded-btn border border-border bg-surface px-4 text-sm font-semibold text-ink"
              >
                Back
              </button>
            )}
            <button
              onClick={() => (last ? finish() : setPhase(step + 1))}
              className="h-11 flex-1 rounded-btn bg-accent font-display font-semibold text-surface"
            >
              {last ? "Got it" : "Next"}
            </button>
          </div>
        </div>
        <div className="mx-auto mt-2 h-3 w-3 rotate-45 bg-surface" style={{ marginBottom: "-6px" }} />
      </div>

      {/* highlighted nav replica over the real tab bar */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-around border-t border-border bg-surface px-1.5 pb-2.5 pt-2">
        {navItem("feed", "Feed", <HomeIcon />)}
        {navItem("log", "Log", <PlusIcon />, true)}
        {navItem("profile", "Profile", <UserIcon />)}
      </div>
    </div>
  );
}

function LogPreview() {
  return (
    <div className="mt-3 rounded-xl border border-border bg-chip p-2.5">
      <div className="grid h-16 place-items-center rounded-lg bg-gradient-to-br from-accent-soft to-chip text-muted">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded-pill border border-border bg-surface px-2 py-1 text-[0.62rem] font-semibold text-body-2">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Tag location
        </span>
        <span className="rounded-pill bg-accent px-3 py-1 font-display text-[0.62rem] font-bold text-surface">Post</span>
      </div>
    </div>
  );
}

function ProfilePreview() {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-chip p-2.5">
      <svg width="46" height="46" viewBox="0 0 46 46" className="flex-none">
        <circle cx="23" cy="23" r="19" fill="none" stroke="rgb(var(--c-track))" strokeWidth="5" />
        <circle cx="23" cy="23" r="19" fill="none" stroke="rgb(var(--c-accent))" strokeWidth="5" strokeLinecap="round" strokeDasharray="119.4" strokeDashoffset="39.8" transform="rotate(-90 23 23)" />
        <text x="23" y="27" textAnchor="middle" className="fill-[rgb(var(--c-ink))] font-display text-[11px] font-bold">
          8/12
        </text>
      </svg>
      <div className="grid flex-1 grid-cols-2 gap-1.5">
        <div className="rounded-lg bg-surface px-2 py-1.5 text-center">
          <div className="font-display text-[0.9rem] font-bold text-ink">16h</div>
          <div className="text-[0.56rem] font-semibold text-muted">banked</div>
        </div>
        <div className="rounded-lg bg-surface px-2 py-1.5 text-center">
          <div className="font-display text-[0.9rem] font-bold text-gold">$50</div>
          <div className="text-[0.56rem] font-semibold text-muted">earned</div>
        </div>
      </div>
    </div>
  );
}
