"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MockScreen, type ScreenKey } from "@/components/tour/MockScreens";

export type TourStep = {
  screen: ScreenKey;
  selector: string;
  title: string;
  body: string;
};

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 6;

export function SpotlightTour({
  steps,
  onClose,
}: {
  steps: TourStep[];
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [col, setCol] = useState<Rect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const step = steps[index];
  const last = index >= steps.length - 1;

  // Measure the highlighted element inside the mock screen (and the app
  // column) whenever the step or its screen changes.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const cr = container.getBoundingClientRect();
      setCol({ top: cr.top, left: cr.left, width: cr.width, height: cr.height });
      const el = container.querySelector<HTMLElement>(step.selector);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else {
        setRect(null);
      }
    };

    measure();
    const t = setTimeout(measure, 80); // settle after the screen fade
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, [index, step.selector, step.screen]);

  // Lock body scroll while the tour runs.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const vw = typeof window !== "undefined" ? window.innerWidth : 390;

  const t = rect ? Math.max(rect.top - PAD, 0) : 0;
  const l = rect ? Math.max(rect.left - PAD, 0) : 0;
  const w = rect ? rect.width + PAD * 2 : 0;
  const h = rect ? rect.height + PAD * 2 : 0;

  const dim = "absolute bg-black/60 transition-all duration-300 ease-out";
  const placeAbove = rect ? rect.top + rect.height / 2 > vh / 2 : true;

  // Keep the tooltip inside the app column on wide screens.
  const tipLeft = col ? col.left + 14 : 14;
  const tipWidth = col ? col.width - 28 : vw - 28;
  const tooltipStyle: React.CSSProperties = placeAbove
    ? { bottom: vh - t + 12, left: tipLeft, width: tipWidth }
    : { top: t + h + 12, left: tipLeft, width: tipWidth };

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
      {/* Backdrop behind the phone-width mock column */}
      <div className="absolute inset-0 bg-ground" />

      {/* The staged mock screen */}
      <div
        ref={containerRef}
        className="absolute inset-y-0 left-1/2 w-full max-w-app -translate-x-1/2 overflow-hidden"
      >
        <div key={step.screen} className="h-full animate-tour-screen">
          <MockScreen screen={step.screen} />
        </div>
      </div>

      {/* Spotlight: four dimmed panels leaving a clear hole over the target */}
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
            className="pointer-events-none absolute rounded-[14px] ring-2 ring-accent transition-all duration-300 ease-out"
            style={{ top: t, left: l, width: w, height: h }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/50" />
      )}

      {/* Click shield so the mock underneath can't be interacted with */}
      <div className="absolute inset-0" aria-hidden onClick={(e) => e.stopPropagation()} />

      {/* Tooltip card */}
      <div
        className="absolute rounded-card border border-border bg-surface p-4 shadow-sheet transition-all duration-300 ease-out"
        style={tooltipStyle}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-eyebrow text-muted-2">
            {index + 1} of {steps.length}
          </span>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-muted-2 hover:text-ink"
          >
            Skip tour
          </button>
        </div>
        <h3 className="mt-2 font-display text-lg font-semibold leading-tight text-ink">
          {step.title}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-body-2">{step.body}</p>

        <div className="mt-3 flex items-center justify-between">
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
              onClick={() => (last ? onClose() : setIndex((i) => i + 1))}
              className="rounded-btn bg-accent px-4 py-2 text-sm font-semibold text-surface"
            >
              {last ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
