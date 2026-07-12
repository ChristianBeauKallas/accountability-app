"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

// A generic, informational card-deck walkthrough — the shared shell behind the
// contextual tours (read-the-board + posting, profile, chat). It handles the
// centered overlay, progress dots, Back/Next, and an optional Skip, and reuses
// the same visual language as the first-run Welcome tour. Gating (when to open)
// and completion flags live in the small wrapper components that render it.

export type Card = {
  // An emoji string, or any JSX (e.g. a mock post-card), shown up top.
  visual?: ReactNode;
  title: string;
  body: ReactNode;
};

export default function WalkThrough({
  cards,
  open,
  onClose,
  finalLabel = "Got it",
  startLabel,
  skippable = false,
}: {
  cards: Card[];
  open: boolean;
  onClose: () => void;
  finalLabel?: string;
  // Label for the Next button on the very first card (defaults to "Next").
  startLabel?: string;
  skippable?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => setMounted(true), []);
  // Reset to the first card each time it opens.
  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  if (!mounted || !open || cards.length === 0) return null;

  const card = cards[Math.min(i, cards.length - 1)];
  const last = i >= cards.length - 1;
  const first = i === 0;

  function done() {
    setI(0);
    onClose();
  }

  return createPortal(
    <div className="tour-overlay" role="dialog" aria-modal="true">
      <div className="tour-card">
        {skippable && (
          <button
            type="button"
            className="tour-skip"
            onClick={done}
            aria-label="Skip walkthrough"
          >
            Skip
          </button>
        )}

        {card.visual !== undefined && (
          <div className="tour-icon">{card.visual}</div>
        )}
        <h2 className="tour-title">{card.title}</h2>
        <p className="tour-body">{card.body}</p>

        <div className="tour-dots">
          {cards.map((_, d) => (
            <span
              key={d}
              className={`tour-dot ${d === i ? "on" : ""}`}
              aria-hidden
            />
          ))}
        </div>

        <div className="tour-nav">
          {i > 0 ? (
            <button
              type="button"
              className="tour-back"
              onClick={() => setI((n) => n - 1)}
            >
              Back
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="tour-next"
            onClick={() => (last ? done() : setI((n) => n + 1))}
          >
            {last ? finalLabel : first && startLabel ? startLabel : "Next"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
