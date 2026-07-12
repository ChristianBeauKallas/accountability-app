"use client";

import { useEffect, useState } from "react";
import {
  enablePush,
  disablePush,
  pushSubscribed,
  pushSupported,
} from "@/lib/push";

export default function HeaderBell({ userId }: { userId: string }) {
  const [supported, setSupported] = useState(true);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported()) {
      setSupported(false);
      return;
    }
    pushSubscribed().then(setOn);
  }, []);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    if (on) {
      await disablePush(userId);
      setOn(false);
    } else {
      const r = await enablePush(userId);
      setOn(r === "granted");
    }
    setBusy(false);
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      className={`head-icon bell ${on ? "on" : "off"} ${busy ? "busy" : ""}`}
      onClick={toggle}
      disabled={busy}
      aria-busy={busy}
      aria-label={
        busy
          ? "Updating notifications…"
          : on
            ? "Notifications on — tap to turn off"
            : "Turn on notifications"
      }
    >
      {on ? "🔔" : "🔕"}
    </button>
  );
}
