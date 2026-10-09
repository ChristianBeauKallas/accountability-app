"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

export type ProgramTab = "about" | "updates" | "facilities";

type Step = { tab: ProgramTab; title: string; body: string };

const STEPS: Step[] = [
  {
    tab: "about",
    title: "This is your recruiting page 🎉",
    body: "Everything you just built — this is exactly what a player sees when they're interested in you.",
  },
  {
    tab: "about",
    title: "Your story, up top",
    body: "Your bio and the value-adds we drafted live in About. Tap Edit anytime to change them.",
  },
  {
    tab: "updates",
    title: "Post updates",
    body: "Share camp dates, commitments and wins here — players following you see every one.",
  },
  {
    tab: "facilities",
    title: "Show off your facilities",
    body: "Add photos of your field, cages and weight room so recruits can picture themselves here.",
  },
];

/**
 * A guided walkthrough of the coach's own, freshly-built program page. It
 * drives the real tabs as it advances (so the coach sees their actual
 * content), then hands off to posting their first need.
 *
 * `skipFacilities` drops the facilities step when the coach already added
 * facility photos during onboarding.
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
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const last = index >= steps.length - 1;

  // Switch the page to the step's tab and bring the top into view.
  useEffect(() => {
    onTab(step.tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[70] flex justify-center px-4 pb-[calc(16px+env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
    >
      {/* soft scrim so the card reads over the page without hiding it */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/50 to-transparent"
        aria-hidden
      />
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

        <div className="mt-4 flex items-center justify-between">
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
              {last ? "Post my first need" : "Next"}
              <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
