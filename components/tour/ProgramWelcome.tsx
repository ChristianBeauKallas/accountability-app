"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { BaseballIcon } from "@/components/ui/BaseballIcon";

export type ProgramTab = "about" | "updates" | "facilities";

type Step = { tab: ProgramTab; selector: string; title: string; body: string };
type Rect = { top: number; left: number; width: number; height: number };

const STEPS: Step[] = [
  {
    tab: "about",
    selector: '[data-tour="pg-header"]',
    title: "This is your program's profile ⚾️",
    body: "Everything you just built — this is exactly what a player sees when they're interested in you.",
  },
  {
    tab: "about",
    selector: '[data-tour="pg-content"]',
    title: "Your program's pitch",
    body: "Your bio and the value-adds we drafted live in About. Tap Edit anytime to change them.",
  },
  {
    tab: "updates",
    selector: '[data-tour="pg-content"]',
    title: "Post updates",
    body: "Keep recruits in the loop — share camp dates, commitments, wins, and any other important updates here. Players following your program will see them.",
  },
  {
    tab: "facilities",
    selector: '[data-tour="pg-content"]',
    title: "Show off your facilities",
    body: "Athletx is built for small-college programs that can't fly every recruit out. Showcase your facilities — field, cages, weight room, academic centers — so recruits can picture themselves there without visiting first.",
  },
];

const PAD = 8;

/**
 * Guided walkthrough of the coach's own, freshly-built program page. An intro
 * card, then it drives the real tabs and spotlights the real section being
 * described, then hands off to the rest of the app.
 */
export function ProgramWelcome({
  onTab,
  onDone,
  skipFacilities = false,
}: {
  onTab: (t: ProgramTab) => void;
  onDone: () => void;
  skipFacilities?: boolean;
}) {
  const steps = skipFacilities
    ? STEPS.filter((s) => s.tab !== "facilities")
    : STEPS;
  const [phase, setPhase] = useState<"intro" | "steps">("intro");
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = steps[index];
  const last = index >= steps.length - 1;

  // Switch to the step's tab as we advance.
  useEffect(() => {
    if (phase === "steps") onTab(step.tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index]);

  // Lock scroll while the tour runs.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Scroll the target into view and measure it (re-measure on scroll/resize).
  useLayoutEffect(() => {
    if (phase !== "steps") {
      setRect(null);
      return;
    }
    const measure = () => {
      const el = document.querySelector(step.selector);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    const el = document.querySelector(step.selector) as HTMLElement | null;
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    const t1 = setTimeout(measure, 60);
    const t2 = setTimeout(measure, 420);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [phase, index, step.selector]);

  // ---- Intro (centered) ----
  if (phase === "intro") {
    return (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center px-6"
        role="dialog"
        aria-modal="true"
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative w-full max-w-[20rem] animate-tour-screen rounded-card border border-border bg-surface p-6 text-center shadow-sheet">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-pill bg-accent-soft text-accent">
            <BaseballIcon size={26} strokeWidth={2} aria-hidden />
          </div>
          <h3 className="font-display text-xl font-bold leading-tight text-ink">
            Let us show you your program page
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-body-2">
            A quick walk through what recruits see — and where to add the rest.
          </p>
          <button
            onClick={() => setPhase("steps")}
            className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-btn bg-accent px-4 py-3 text-sm font-semibold text-surface"
          >
            Show me
            <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
          </button>
          <button
            onClick={onDone}
            className="mt-2 w-full py-1 text-center text-xs font-semibold text-muted-2"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  // ---- Steps (spotlight + bottom card) ----
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const vw = typeof window !== "undefined" ? window.innerWidth : 390;
  const t = rect ? Math.max(rect.top - PAD, 0) : 0;
  const l = rect ? Math.max(rect.left - PAD, 0) : 0;
  const w = rect ? rect.width + PAD * 2 : 0;
  const h = rect ? rect.height + PAD * 2 : 0;
  const dim = "fixed bg-black/55 transition-all duration-300 ease-out";

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
      {rect ? (
        <>
          <div className={dim} style={{ top: 0, left: 0, width: "100%", height: t }} />
          <div
            className={dim}
            style={{ top: t + h, left: 0, width: "100%", height: Math.max(vh - (t + h), 0) }}
          />
          <div className={dim} style={{ top: t, left: 0, width: l, height: h }} />
          <div
            className={dim}
            style={{ top: t, left: l + w, width: Math.max(vw - (l + w), 0), height: h }}
          />
          <div
            className="pointer-events-none fixed rounded-[16px] ring-2 ring-accent transition-all duration-300 ease-out"
            style={{ top: t, left: l, width: w, height: h }}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-black/55" />
      )}

      {/* Bottom card */}
      <div className="fixed inset-x-0 bottom-0 flex justify-center px-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
        <div className="relative w-full max-w-app animate-tour-screen rounded-card border border-border bg-surface p-4 shadow-sheet">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-eyebrow text-muted-2">
              {index + 1} of {steps.length}
            </span>
            <button
              onClick={onDone}
              className="text-xs font-semibold text-muted-2 hover:text-ink"
            >
              Skip
            </button>
          </div>
          <h3 className="mt-2 font-display text-lg font-semibold leading-tight text-ink">
            {step.title}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-body-2">{step.body}</p>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex gap-1.5">
              {steps.map((_, k) => (
                <span
                  key={k}
                  className={
                    "h-1.5 rounded-pill transition-all " +
                    (k === index ? "w-5 bg-accent" : "w-1.5 bg-border")
                  }
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {index > 0 && (
                <button
                  onClick={() => setIndex((i) => i - 1)}
                  className="rounded-btn px-3 py-2 text-sm font-semibold text-body-2"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => (last ? onDone() : setIndex((i) => i + 1))}
                className="inline-flex items-center gap-1.5 rounded-btn bg-accent px-4 py-2 text-sm font-semibold text-surface"
              >
                {last ? "Continue — show me the rest" : "Next"}
                <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
