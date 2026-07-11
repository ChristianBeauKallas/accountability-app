"use client";

import { useEffect, useState } from "react";
import { enablePush, pushSupported } from "@/lib/push";

export default function NotificationsToggle({ userId }: { userId: string }) {
  const [state, setState] = useState<
    "unknown" | "on" | "off" | "unsupported" | "denied" | "working"
  >("unknown");

  useEffect(() => {
    if (!pushSupported()) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "granted") setState("on");
    else if (Notification.permission === "denied") setState("denied");
    else setState("off");
  }, []);

  async function turnOn() {
    setState("working");
    const result = await enablePush(userId);
    if (result === "granted") setState("on");
    else if (result === "denied") setState("denied");
    else if (result === "unsupported") setState("unsupported");
    else setState("off");
  }

  return (
    <div className="notif-toggle">
      <div>
        <strong>🔔 Notifications</strong>
        <p className="notif-sub">
          {state === "on" && "On — you'll be nudged on new posts, comments & chats."}
          {state === "off" && "Get nudged when the group posts, comments, or chats."}
          {state === "working" && "Setting up…"}
          {state === "denied" &&
            "Blocked in your browser settings. Re-enable notifications for this site, then try again."}
          {state === "unsupported" &&
            "This device/browser can't do push. On iPhone, add the app to your Home Screen first, then come back."}
          {state === "unknown" && ""}
        </p>
      </div>
      {(state === "off" || state === "denied") && (
        <button className="notif-btn" onClick={turnOn}>
          Enable
        </button>
      )}
      {state === "on" && <span className="notif-on">✓ On</span>}
    </div>
  );
}
