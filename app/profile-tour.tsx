"use client";

import { useEffect, useState } from "react";
import WalkThrough, { type Card } from "./walkthrough";
import { tourDone, markTourDone } from "@/lib/tours";

// Fires the first time a member opens their own profile. Explains what the four
// stat tiles mean and how to edit their photo, name, and bio.

const CARDS: Card[] = [
  {
    visual: "📖",
    title: "This is your story",
    body: (
      <>
        Your profile is your history — your streaks, how this month is going, and
        every update you&apos;ve posted, all in one place.
      </>
    ),
  },
  {
    visual: "📊",
    title: "What the numbers mean",
    body: (
      <>
        🔥 Current streak · 🏆 Best streak ever · 📅 This month (full days / days
        so far) · ✅ All time (full days / days on the app). Only days where you
        finish everything count toward a streak.
      </>
    ),
  },
  {
    visual: "✏️",
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
