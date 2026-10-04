"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";

export function FitsInfo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="How your fits work"
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
              <span className="eyebrow">How your fits work</span>
              <button
                onClick={() => setOpen(false)}
                className="text-muted"
                aria-label="Close"
              >
                <X size={22} strokeWidth={2} />
              </button>
            </div>
            <div className="space-y-4 px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-5">
              <p className="text-[15px] leading-relaxed text-body-2">
                Athletx reads your profile — your position, class year,
                measurables, academics, and the levels and locations you&rsquo;re
                open to — and matches it against what each college program is
                actively recruiting.
              </p>
              <p className="text-[15px] leading-relaxed text-body-2">
                You only see openings you&rsquo;re genuinely eligible for, ranked
                by how closely you fit. The higher the number, the stronger the
                match.
              </p>
              <p className="text-[15px] leading-relaxed text-body-2">
                Coaches don&rsquo;t browse players — a program only sees you once
                you tap <span className="font-semibold text-ink">I&rsquo;m Interested</span>.
                The more complete your profile, the more spots you&rsquo;ll match
                with.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
