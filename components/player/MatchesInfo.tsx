"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";

const STAGES: { label: string; body: string; tone: "accent" | "gold" | "muted" }[] =
  [
    {
      label: "Interested",
      tone: "accent",
      body: "Programs you've shown interest in. The coach has it in their inbox but hasn't responded yet.",
    },
    {
      label: "Mutual",
      tone: "gold",
      body: "You and the coach showed mutual interest. Your contact information will be shared with them.",
    },
    {
      label: "Closed",
      tone: "muted",
      body: "The coach passed on this one for now. You'll get the next one!",
    },
  ];

const TONE: Record<"accent" | "gold" | "muted", string> = {
  accent: "bg-accent-soft text-accent",
  gold: "bg-warm-soft text-warm-text",
  muted: "bg-chip text-muted",
};

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
            <div className="space-y-5 px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-5">
              {STAGES.map((s) => (
                <div key={s.label}>
                  <span
                    className={`inline-block rounded-pill px-3 py-1 text-xs font-bold uppercase tracking-eyebrow ${TONE[s.tone]}`}
                  >
                    {s.label}
                  </span>
                  <p className="mt-2 text-[15px] leading-relaxed text-body-2">
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
