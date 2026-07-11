"use client";

import { useEffect, useState } from "react";

// First-run walkthrough. Auto-opens once per account (tracked in localStorage
// so it needs no schema change), and can be replayed anytime from the header
// "?" button. Card one leaves room for a personal intro video later.
type Card = { icon: string; title: string; body: string };

function cards(groupName: string): Card[] {
  return [
    {
      icon: "👋",
      title: `Welcome to ${groupName}`,
      body: "This is your crew's daily accountability board. Show up each day, log what you did, keep your streak, and cheer each other on.",
    },
    {
      icon: "⭕",
      title: "Your ring is your day",
      body: "Tap the ＋ button and check off what you did. Each activity fills the ring around your photo a little more. Fill it all the way and you've completed the day.",
    },
    {
      icon: "🔥",
      title: "Streaks reward showing up",
      body: "Log everything in a day and it counts toward your streak. Miss one and the ring won't close — but a day you've already won stays won, even if new activities get added later.",
    },
    {
      icon: "💬",
      title: "React, comment, chat",
      body: "Drop a 🔥 or 👍 on anyone's update and leave comments. Once you're done for the day, head to Chat for banter, photos, and voice notes.",
    },
    {
      icon: "🚀",
      title: "You're all set",
      body: "Tap the ＋ to log your first day. You can replay this walkthrough anytime from the “?” at the top of the board.",
    },
  ];
}

export default function Tour({
  userId,
  groupName,
}: {
  userId: string;
  groupName: string;
}) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const deck = cards(groupName);
  const key = `gb_tour_done_${userId}`;

  // Auto-open the first time this account sees the board.
  useEffect(() => {
    try {
      if (!localStorage.getItem(key)) setOpen(true);
    } catch {
      /* private mode / storage blocked — just skip auto-open */
    }
  }, [key]);

  function markSeen() {
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
  }

  function close() {
    markSeen();
    setOpen(false);
    setI(0);
  }

  function replay() {
    setI(0);
    setOpen(true);
  }

  const last = i === deck.length - 1;
  const card = deck[i];

  return (
    <>
      <button
        type="button"
        className="head-icon"
        aria-label="How it works"
        onClick={replay}
      >
        ?
      </button>

      {open && (
        <div className="tour-overlay" role="dialog" aria-modal="true">
          <div className="tour-card">
            <button
              type="button"
              className="tour-skip"
              onClick={close}
              aria-label="Skip walkthrough"
            >
              Skip
            </button>

            <div className="tour-icon">{card.icon}</div>
            <h2 className="tour-title">{card.title}</h2>
            <p className="tour-body">{card.body}</p>

            <div className="tour-dots">
              {deck.map((_, d) => (
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
              {last ? (
                <button type="button" className="tour-next" onClick={close}>
                  Get started
                </button>
              ) : (
                <button
                  type="button"
                  className="tour-next"
                  onClick={() => setI((n) => n + 1)}
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
