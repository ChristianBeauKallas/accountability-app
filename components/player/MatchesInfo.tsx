"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";

const STAGES: { label: string; body: string }[] = [
  {
    label: "Interested",
    body: "Spots you've tapped I'm Interested on. The coach has it in their inbox but hasn't responded yet — the ball's in their court.",
  },
  {
    label: "Mutual",
    body: "The coach marked interest back in you. These are your strongest leads — worth following up on.",
  },
  {
    label: "Closed",
    body: "The coach passed on this one for now. It happens to everyone — keep showing interest in new spots.",
  },
];

export function MatchesInfo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="What these tabs mean"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill text-muted-2 transition-colors hover:text-accent"
      >
        <Info size={19} strokeWidth={2} aria-hidden />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60">
          <button
            className="flex-1"
            onClick={() => setOpen(false)}
            aria-label="Close"
          />
          <div className="mx-auto w-full max-w-app rounded-t-[20px] bg-ground shadow-sheet">
            <div className="flex items-center justify-between border-b border-divider px-5 py-3">
              <span className="eyebrow">Where each spot stands</span>
              <button
                onClick={() => setOpen(false)}
                className="text-muted"
                aria-label="Close"
              >
                <X size={22} strokeWidth={2} />
              </button>
            </div>
            <div className="space-y-4 px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-5">
              {STAGES.map((s) => (
                <div key={s.label} className="flex gap-3">
                  <span className="mt-0.5 shrink-0 rounded-pill bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent">
                    {s.label}
                  </span>
                  <p className="text-[15px] leading-relaxed text-body-2">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
