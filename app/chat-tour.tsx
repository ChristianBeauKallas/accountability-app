"use client";

import { useEffect, useState } from "react";
import WalkThrough, { type Card } from "./walkthrough";
import { tourDone, markTourDone } from "@/lib/tours";

// Fires the first time a member opens the Chat tab — with mock-ups of the
// thread and the composer so it's concrete.

// A mock of the chat thread: a couple of message bubbles.
function ThreadMock() {
  return (
    <div className="tour-phone tph-chat" aria-hidden>
      <div className="tph-msg">
        <span className="tph-msg-av">J</span>
        <span className="tph-bubble">Big session this morning 💪</span>
      </div>
      <div className="tph-msg mine">
        <span className="tph-bubble mine">Let&apos;s go 🔥</span>
      </div>
      <div className="tph-msg">
        <span className="tph-msg-av">M</span>
        <span className="tph-bubble">On my way now</span>
      </div>
    </div>
  );
}

// A mock of the chat composer bar: text, photo, voice.
function ComposerMock() {
  return (
    <div className="tour-phone tph-chatbar-wrap" aria-hidden>
      <div className="tph-chatbar">
        <span className="tph-chatinput">Message the crew…</span>
        <span className="tph-chatbtn">📷</span>
        <span className="tph-chatbtn">🎙️</span>
        <span className="tph-chatsend">➤</span>
      </div>
    </div>
  );
}

const CARDS: Card[] = [
  {
    visual: <ThreadMock />,
    title: "The crew's group chat",
    body: (
      <>
        This is the space for banter, ideas, and hype — everything that
        isn&apos;t a daily check-in. It&apos;s the whole crew in one thread.
      </>
    ),
  },
  {
    visual: <ComposerMock />,
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
