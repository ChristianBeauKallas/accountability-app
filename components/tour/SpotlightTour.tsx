"use client";

import { useEffect, useLayoutEffect, useState } from "react";

export type TourStep = {
  selector: string;
  title: string;
  body: string;
};

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 8;

export function SpotlightTour({
  steps,
  onClose,
}: {
  steps: TourStep[];
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const last = index >= steps.length - 1;

  // Measure the current step's target (scrolling it into view first).
  useLayoutEffect(() => {
    const step = steps[index];
    const el = document.querySelector<HTMLElement>(step.selector);
    if (!el) {
      // Target not on screen — skip gracefully.
      if (!last) setIndex((i) => i + 1);
      else onClose();
      return;
    }

    el.scrollIntoView({ block: "center", behavior: "smooth" });

    const measure = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    const t = setTimeout(measure, 320);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Lock body scroll while the tour runs.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!rect) {
    return (
      <div className="fixed inset-0 z-[70] bg-black/70" aria-hidden />
    );
  }

  const t = Math.max(rect.top - PAD, 0);
  const l = Math.max(rect.left - PAD, 0);
  const w = rect.width + PAD * 2;
  const h = rect.height + PAD * 2;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const vw = typeof window !== "undefined" ? window.innerWidth : 390;

  const dim = "absolute bg-black/70 transition-all duration-300";
  const centerY = rect.top + rect.height / 2;
  const placeAbove = centerY > vh / 2;

  const tooltipStyle: React.CSSProperties = placeAbove
    ? { bottom: vh - t + 14, left: 16, right: 16 }
    : { top: t + h + 14, left: 16, right: 16 };

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
      {/* Click blocker so the app underneath can't be touched mid-tour */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      {/* Four dimmed panels leaving a clear hole over the target */}
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

      {/* Accent ring around the target */}
      <div
        className="pointer-events-none absolute rounded-[14px] ring-2 ring-accent transition-all duration-300"
        style={{ top: t, left: l, width: w, height: h }}
      />

      {/* Tooltip card */}
      <div
        className="absolute mx-auto max-w-app rounded-card border border-border bg-surface p-4 shadow-sheet"
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
          {steps[index].title}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-body-2">
          {steps[index].body}
        </p>

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
