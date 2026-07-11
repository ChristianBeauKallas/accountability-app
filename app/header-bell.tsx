"use client";

import { useEffect, useState } from "react";
import { enablePush, pushSupported } from "@/lib/push";

export default function HeaderBell({ userId }: { userId: string }) {
  const [supported, setSupported] = useState(true);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported()) {
      setSupported(false);
      return;
    }
    setOn(Notification.permission === "granted");
  }, []);

  async function toggle() {
    if (on || busy) return;
    setBusy(true);
    const r = await enablePush(userId);
    setOn(r === "granted");
    setBusy(false);
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      className={`head-icon bell ${on ? "on" : "off"}`}
      onClick={toggle}
      aria-label={on ? "Notifications on" : "Turn on notifications"}
    >
      🔔
    </button>
  );
}
