"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { BaseballIcon } from "@/components/ui/BaseballIcon";

export type ProgramTab = "about" | "updates" | "facilities";

type Step = { tab: ProgramTab; title: string; body: string };

const STEPS: Step[] = [
  {
    tab: "about",
    title: "This is your program's profile ⚾️",
    body: "Everything you just built — this is exactly what a player sees when they're interested in you.",
  },
  {
    tab: "about",
    title: "Your program's highlights",
    body: "Your bio and all the value-adds we talked about live in the About section. Tap Edit anytime to change them.",
  },
  {
    tab: "updates",
    title: "Post updates",
    body: "Keep recruits in the loop — share camp dates, commitments, wins, and any other important updates here. Players following your program will see them.",
  },
  {
    tab: "facilities",
    title: "Show off your facilities",
    body: "Athletx is built for small-college programs that can't fly every recruit out. Showcase your facilities — field, cages, weight room, academic centers — so recruits can picture themselves there without visiting first.",
  },
];

/**
 * Guided walkthrough of the coach's own, freshly-built program page. An intro
 * card, then it drives the real tabs (showing the actual content) with a card
 * describing each, then hands off to the rest of the app.
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
  const step = steps[index];
  const last = index >= steps.length - 1;

  // Switch to the step's tab and bring the top of the content into view.
  useEffect(() => {
    if (phase !== "steps") return;
    onTab(step.tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index]);

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

  // ---- Steps (whole page visible; a card describes each tab) ----
  return (
    <div className="pointer-events-none fixed inset-0 z-[70]" role="dialog" aria-modal="true">
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 h-60 bg-gradient-to-t from-black/55 to-transparent"
        aria-hidden
      />
      <div className="pointer-events-auto fixed inset-x-0 bottom-0 flex justify-center px-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
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
