"use client";

import Link from "next/link";
import { useState } from "react";
import { createPortal } from "react-dom";

// Entry point for changing your program mid-stream. Two paths:
//   • Edit current plan — tweak workouts/targets in the plan editor.
//   • Start a new block — redo intake and generate a fresh program.
// Either way your streak and history carry over; activating the new plan
// clears upcoming day-overrides and keeps your own custom habits.
export default function RevisePlan({ editHref }: { editHref: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  if (!mounted && typeof window !== "undefined") setMounted(true);

  return (
    <>
      <button
        type="button"
        className="head-icon"
        aria-label="Revise plan"
        onClick={() => setOpen(true)}
      >
        ⚙
      </button>

      {mounted &&
        open &&
        createPortal(
          <div className="tour-overlay" role="dialog" aria-modal="true">
            <div className="tour-card pm-card">
              <h2 className="tour-title">Revise your plan</h2>
              <p className="tour-body">
                Changing how you train? Your streak and history carry over — the
                new plan just takes over from today.
              </p>
              <Link href={editHref} className="revise-opt">
                <span className="revise-opt-ic">✏️</span>
                <span>
                  <span className="revise-opt-title">Edit current plan</span>
                  <span className="revise-opt-sub">
                    Tweak workouts, targets, or the weekly split.
                  </span>
                </span>
              </Link>
              <Link href="/coaching/intake" className="revise-opt">
                <span className="revise-opt-ic">🔄</span>
                <span>
                  <span className="revise-opt-title">Start a new block</span>
                  <span className="revise-opt-sub">
                    Redo your intake and generate a fresh program.
                  </span>
                </span>
              </Link>
              <div className="tour-nav">
                <span />
                <button type="button" className="tour-back" onClick={() => setOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
