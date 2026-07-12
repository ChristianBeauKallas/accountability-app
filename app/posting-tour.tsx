"use client";

import { useEffect, useState } from "react";
import WalkThrough, { type Card } from "./walkthrough";
import { tourDone, markTourDone, installSeen } from "@/lib/tours";

// The second-session walkthrough. Once the member has been through the Welcome
// tour and dismissed the "add to home screen" nudge, the next time they open
// the board this runs as one continuous flow: first it teaches them to *read*
// the board (the rings up top), then it walks them through *posting* — logging,
// dictation, photos, what a finished post shows, and how to fix one.
//
// Option B: it also fires the first time they tap ＋ if they somehow got past it
// without completing it. When triggered that way, finishing it opens the
// composer so they flow straight into their first post.

// A neon progress ring at a given fill (0–1), matching the roster avatars.
function Ring({
  fill,
  initial,
  size = 46,
}: {
  fill: number;
  initial: string;
  size?: number;
}) {
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  return (
    <span className="tmr-ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={c}
          cy={c}
          r={r}
          className="tour-ring-bg"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={c}
          cy={c}
          r={r}
          className="tour-ring-fg"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - fill)}
          strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`}
        />
      </svg>
      <span className="tmr-initial">{initial}</span>
    </span>
  );
}

function BoardVisual() {
  return (
    <div className="tour-mini-roster">
      <span className="tmr-item">
        <Ring fill={1} initial="A" />
        <span className="tmr-name">Alex</span>
      </span>
      <span className="tmr-item">
        <Ring fill={0.6} initial="J" />
        <span className="tmr-name">Jo</span>
      </span>
      <span className="tmr-item">
        <Ring fill={0.2} initial="M" />
        <span className="tmr-name">Mia</span>
      </span>
    </div>
  );
}

// A static mock of a finished post-card, used to point out its parts.
function MockPost() {
  return (
    <div className="tour-mockpost" aria-hidden>
      <div className="tmp-head">
        <span className="tmp-avatar">A</span>
        <span className="tmp-head-text">
          <span className="tmp-name">Alex</span>
          <span className="tmp-date">Today · 8:24 AM</span>
        </span>
        <span className="tmp-dots">⋯</span>
      </div>
      <div className="tmp-photo">🏞️</div>
      <p className="tmp-caption">Morning run done — legs felt strong today.</p>
      <div className="tmp-meta">
        <span className="tmp-pill">✓ 3/5</span>
        <span className="tmp-listen">▶ Listen</span>
      </div>
      <div className="tmp-react">
        <span className="tmp-chip">🔥 2</span>
        <span className="tmp-chip">👍 1</span>
        <span className="tmp-chip">💬 Comment</span>
      </div>
    </div>
  );
}

const CARDS: Card[] = [
  {
    visual: <BoardVisual />,
    title: "Read the board",
    body: (
      <>
        The row up top is your crew. The neon ring around each photo fills as
        they complete the day&apos;s activities — so the second you open the app,
        you can tell who&apos;s on track at a glance. Yours fills as you log, too
        — a full ring means you finished your day.
      </>
    ),
  },
  {
    visual: "➕",
    title: "Let's walk you through posting",
    body: (
      <>
        It only takes about thirty seconds a day. Tap the ＋ each day, mark what
        you did, and add as much or as little as you want.
      </>
    ),
  },
  {
    visual: "✅",
    title: "Log what you did",
    body: (
      <>
        Tap the ＋ and check off the activities you finished. Each one fills a
        slice of your ring — fill it all the way to win the day.
      </>
    ),
  },
  {
    visual: "🎙️",
    title: "Just talk — we'll write it",
    body: (
      <>
        Tap 🎙️ and talk through your day. We&apos;ll turn it into a clean caption
        you can edit, and your recording gets attached, so the crew can listen.
        Prefer to type? That works too.
      </>
    ),
  },
  {
    visual: "📷",
    title: "Add a photo (optional)",
    body: (
      <>
        Attach a photo (or photos) — a gym mirror, a plate, the view from your
        run. Totally optional, but it makes the board come alive.
      </>
    ),
  },
  {
    visual: <MockPost />,
    title: "What's on a post",
    body: (
      <>
        The bottom-left pill (like 3/5) shows how many activities they&apos;ve
        done that day so far, and ▶ Listen on the bottom-right plays their voice
        note. Drop a 🔥 or 👍 and leave a comment — you&apos;ll get a nudge when
        someone does the same on yours.
      </>
    ),
  },
  {
    visual: "⋯",
    title: "Fix a post",
    body: (
      <>
        Made a typo or logged the wrong thing? Tap the ⋯ on any of your own posts
        to edit the caption or delete it.
      </>
    ),
  },
];

export default function PostingTour({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [viaPlus, setViaPlus] = useState(false);

  // Auto-fire on the next board load after the install nudge is behind them.
  useEffect(() => {
    if (
      tourDone("tour", userId) &&
      installSeen() &&
      !tourDone("posting", userId)
    ) {
      const t = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(t);
    }
  }, [userId]);

  // Option B: tapping ＋ before completing it opens it here first.
  useEffect(() => {
    const onPlus = () => {
      setViaPlus(true);
      setOpen(true);
    };
    window.addEventListener("gb-posting-tour", onPlus);
    return () => window.removeEventListener("gb-posting-tour", onPlus);
  }, []);

  function close() {
    markTourDone("posting", userId);
    setOpen(false);
    // If they got here by tapping ＋, flow straight into the composer.
    if (viaPlus) {
      setViaPlus(false);
      try {
        window.dispatchEvent(new Event("gb-open-composer"));
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <WalkThrough
      cards={CARDS}
      open={open}
      onClose={close}
      finalLabel="Got it — let's go"
    />
  );
}
