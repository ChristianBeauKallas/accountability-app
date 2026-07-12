"use client";

import { useEffect, useState } from "react";
import WalkThrough, { type Card } from "./walkthrough";
import { tourDone, markTourDone } from "@/lib/tours";

// Fires the first time a member opens their own profile. Explains what the four
// stat tiles mean and how to edit their photo, name, and bio — with small
// mock-ups of the actual profile so it's concrete.

// A mock of the profile header: avatar, name, bio.
function StoryMock() {
  return (
    <div className="tour-phone tph-prof" aria-hidden>
      <span className="tph-pavatar">A</span>
      <div className="tph-pmeta">
        <span className="tph-pname">Alex</span>
        <span className="tph-pbio">Training for a half-marathon 🏃</span>
      </div>
    </div>
  );
}

// A mock of the four stat tiles.
function StatsMock() {
  const tiles = [
    { num: "7", label: "🔥 Streak" },
    { num: "14", label: "🏆 Best" },
    { num: "9/12", label: "📅 This mo." },
    { num: "21/30", label: "✅ All time" },
  ];
  return (
    <div className="tour-stats" aria-hidden>
      {tiles.map((t) => (
        <div className="ts-tile" key={t.label}>
          <span className="ts-num">{t.num}</span>
          <span className="ts-label">{t.label}</span>
        </div>
      ))}
    </div>
  );
}

// A mock of the editable profile: tap the photo, name, or bio.
function EditMock() {
  return (
    <div className="tour-phone tph-edit" aria-hidden>
      <span className="tph-pavatar big">
        A<span className="tph-pcam">📷</span>
      </span>
      <div className="tph-editfields">
        <span className="tph-editrow">
          Alex <span className="tph-pencil">✏️</span>
        </span>
        <span className="tph-editrow muted">
          Training for a half-marathon <span className="tph-pencil">✏️</span>
        </span>
      </div>
    </div>
  );
}

const CARDS: Card[] = [
  {
    visual: <StoryMock />,
    title: "This is your story",
    body: (
      <>
        Your profile is your history — your streaks, how this month is going, and
        every update you&apos;ve posted, all in one place.
      </>
    ),
  },
  {
    visual: <StatsMock />,
    title: "What the numbers mean",
    body: (
      <span className="tour-defs">
        <span className="tour-def">
          <b>🔥 Current streak</b> — how many days in a row you&apos;ve completed
          every activity.
        </span>
        <span className="tour-def">
          <b>🏆 Best streak</b> — your longest run ever of finishing everything.
        </span>
        <span className="tour-def">
          <b>📅 This month</b> — days you&apos;ve done every activity, out of the
          days that have passed this month.
        </span>
        <span className="tour-def">
          <b>✅ All time</b> — days you&apos;ve finished everything, out of how
          long you&apos;ve been on the app.
        </span>
        <span className="tour-def note">
          Only days where you finish everything count toward a streak.
        </span>
      </span>
    ),
  },
  {
    visual: <EditMock />,
    title: "Make it yours",
    body: <>Tap your photo to change it, or your name and bio to edit them.</>,
  },
];

export default function ProfileTour({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!tourDone("profile", userId)) {
      const t = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(t);
    }
  }, [userId]);

  function close() {
    markTourDone("profile", userId);
    setOpen(false);
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
