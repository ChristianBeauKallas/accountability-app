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
    if (state === "on" || state === "unsupported" || state === "working") return;
    setState("working");
    const result = await enablePush(userId);
    if (result === "granted") setState("on");
    else if (result === "denied") setState("denied");
    else if (result === "unsupported") setState("unsupported");
    else setState("off");
  }

  const on = state === "on";
  const label =
    state === "on"
      ? "On"
      : state === "working"
        ? "…"
        : state === "denied"
          ? "Blocked"
          : state === "unsupported"
            ? "N/A"
            : "Enable";

  return (
    <button
      type="button"
      className={`stat-tile notif-tile ${on ? "on" : ""}`}
      onClick={turnOn}
    >
      <span className="notif-bell">🔔</span>
      <span className="stat-cap">Alerts</span>
      <span className={`notif-state ${on ? "on" : ""}`}>{label}</span>
    </button>
  );
}
