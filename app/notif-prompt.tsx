"use client";

import { useEffect, useState } from "react";
import { enablePush, pushSupported } from "@/lib/push";

// One-time banner nudging the user to enable notifications. Only shows in the
// installed app (where push actually works) so it never fights the install banner.
export default function NotifPrompt({ userId }: { userId: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!pushSupported()) return;
    if (localStorage.getItem("notifPromptSeen")) return;
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      nav.standalone === true;
    if (!standalone) return; // wait until they've installed the app
    if (Notification.permission === "default") setShow(true);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem("notifPromptSeen", "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  async function enable() {
    await enablePush(userId);
    dismiss();
  }

  if (!show) return null;

  return (
    <div className="install-banner">
      <span className="install-icon">🔔</span>
      <span className="install-text">
        Turn on notifications so you don&apos;t miss the crew.
      </span>
      <button className="install-go" onClick={enable}>
        Enable
      </button>
      <button className="install-x" onClick={dismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
