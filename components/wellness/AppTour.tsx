"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

type Page = "feed" | "log" | "profile" | "other";
type Spot = "feed" | "add" | "profile" | null;

type StepDef = {
  key: string;
  page: Page;
  spot: Spot;
  title: string;
  body: string;
  next: string | null; // route+query, or null = done
  prev: string | null;
};

const STEPS: StepDef[] = [
  {
    key: "feed",
    page: "feed",
    spot: "feed",
    title: "Your team feed",
    body: "This is where you track your teammates' progress, cheer people on, and see what everyone's done today.",
    next: "/feed?tour=add",
    prev: null,
  },
  {
    key: "add",
    page: "feed",
    spot: "add",
    title: "Log your activity",
    body: "Tap the + to check in. Let's take a look at what that's like.",
    next: "/log?tour=log",
    prev: "/feed?tour=feed",
  },
  {
    key: "log",
    page: "log",
    spot: null,
    title: "The check-in screen",
    body: "Add a photo or two, tag your location, note what you did, and Post. Every check-in gets you closer to your incentive.",
    next: "/me?tour=profile",
    prev: "/feed?tour=add",
  },
  {
    key: "profile",
    page: "profile",
    spot: "profile",
    title: "Your progress",
    body: "Track your month here: qualifying days, wellness hours banked, cash earned, and your full check-in history.",
    next: null,
    prev: "/log?tour=log",
  },
];

export function AppTour() {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const tour = params.get("tour");
  const page: Page = path === "/feed" ? "feed" : path === "/log" ? "log" : path === "/me" ? "profile" : "other";
  const [intro, setIntro] = useState(false);

  useEffect(() => {
    if (page === "feed" && !tour) {
      try {
        setIntro(!localStorage.getItem(TOUR_KEY));
      } catch {
        setIntro(false);
      }
    } else {
      setIntro(false);
    }
  }, [page, tour]);

  function finish() {
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {
      /* ignore */
    }
    setIntro(false);
    router.push("/feed");
  }

  // Intro prompt (first visit to the feed).
  if (intro && page === "feed" && !tour) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-8">
        <div className="w-full max-w-[320px] rounded-card bg-surface p-6 text-center shadow-card">
          <RunnerMark tile={56} icon={28} radius={16} className="mx-auto" bob />
          <h3 className="mt-4 font-display text-xl font-bold text-ink">Let&apos;s show you around</h3>
          <p className="mt-1.5 text-sm text-body-2">A quick tour of the app — about 30 seconds.</p>
          <button
            onClick={() => {
              setIntro(false);
              router.push("/feed?tour=feed");
            }}
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

  const i = STEPS.findIndex((s) => s.key === tour);
  if (i < 0) return null;
  const step = STEPS[i];
  if (step.page !== page) return null; // only render on the matching screen
  const last = i === STEPS.length - 1;
  const hasNav = step.spot !== null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/55" />

      {/* highlighted nav replica over the real tab bar */}
      {hasNav && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-around border-t border-border bg-surface px-1.5 pt-2 pb-safe">
          <span className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] font-semibold transition ${step.spot === "feed" ? "scale-110 text-accent" : "text-muted opacity-40"}`}>
            <HomeIcon />
            Feed
          </span>
          <span className="flex-none">
            <span className={`-mt-4 grid h-[50px] w-[50px] place-items-center rounded-[16px] bg-accent text-surface transition ${step.spot === "add" ? "scale-110 ring-4 ring-accent/40" : "opacity-40"}`}>
              <PlusIcon />
            </span>
          </span>
          <span className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] font-semibold transition ${step.spot === "profile" ? "scale-110 text-accent" : "text-muted opacity-40"}`}>
            <UserIcon />
            Profile
          </span>
        </div>
      )}

      {/* tooltip card */}
      <div className={`absolute inset-x-0 px-5 ${hasNav ? "bottom-[88px]" : "bottom-6"}`}>
        <div className="mx-auto max-w-[360px] rounded-card bg-surface p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {STEPS.map((_, n) => (
                <span key={n} className={`h-1.5 w-1.5 rounded-full ${n <= i ? "bg-accent" : "bg-track"}`} />
              ))}
            </div>
            <button onClick={finish} className="text-[0.72rem] font-semibold text-muted">
              Skip
            </button>
          </div>
          <h3 className="mt-3 font-display text-lg font-bold text-ink">{step.title}</h3>
          <p className="mt-1 text-[0.86rem] leading-snug text-body-2">{step.body}</p>
          <div className="mt-4 flex items-center gap-2.5">
            {step.prev && (
              <button
                onClick={() => router.push(step.prev!)}
                className="h-11 rounded-btn border border-border bg-surface px-4 text-sm font-semibold text-ink"
              >
                Back
              </button>
            )}
            <button
              onClick={() => (last ? finish() : router.push(step.next!))}
              className="h-11 flex-1 rounded-btn bg-accent font-display font-semibold text-surface"
            >
              {last ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
