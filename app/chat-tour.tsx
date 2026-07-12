"use client";

import { useEffect, useState } from "react";
import WalkThrough, { type Card } from "./walkthrough";
import { tourDone, markTourDone } from "@/lib/tours";

// Fires the first time a member opens the Chat tab.

const CARDS: Card[] = [
  {
    visual: "💬",
    title: "The crew's group chat",
    body: (
      <>
        This is the space for banter, ideas, and hype — everything that
        isn&apos;t a daily check-in. It&apos;s the whole crew in one thread.
      </>
    ),
  },
  {
    visual: "🎙️",
    title: "Say it your way",
    body: (
      <>
        Send a message, snap a 📷 photo, or tap 🎙️ for a voice note. Long-press
        your own message to delete it.
      </>
    ),
  },
];

export default function ChatTour({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!tourDone("chat", userId)) {
      const t = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(t);
    }
  }, [userId]);

  function close() {
    markTourDone("chat", userId);
    setOpen(false);
  }

  return <WalkThrough cards={CARDS} open={open} onClose={close} />;
}
