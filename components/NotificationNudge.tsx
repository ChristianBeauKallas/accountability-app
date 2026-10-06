"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { isStandalone } from "@/lib/pwa";
import {
  pushSupported,
  isSubscribed,
  permission,
  enablePush,
} from "@/lib/push/client";

const KEY = "athletx-push-nudge";

// Once someone opens the installed app, nudge them to turn on push — the
// install step told them this was coming. Browser tabs never see it
// (iOS web push only works once added to the home screen anyway).
export function NotificationNudge() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isStandalone() || !pushSupported()) return;
      const perm = permission();
      if (perm === "granted" || perm === "denied") return;
      try {
        if (localStorage.getItem(KEY) === "1") return;
      } catch {
        /* ignore */
      }
      if (await isSubscribed()) return;
      if (cancelled) return;
      const t = setTimeout(() => setShow(true), 1200);
      return () => clearTimeout(t);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function close() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  async function enable() {
    setBusy(true);
    await enablePush();
    setBusy(false);
    close();
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-6">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-6 text-center shadow-sheet">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-pill bg-accent-soft text-accent">
          <BellRing size={26} strokeWidth={2} aria-hidden />
        </span>
        <h2 className="mt-4 font-display text-2xl font-bold text-ink">
          Turn on notifications
        </h2>
        <p className="mt-2 text-[15px] text-body-2">
          Get a ping the moment someone shows interest or a new match opens up —
          so you never miss a connection.
        </p>
        <div className="mt-6 space-y-2.5">
          <button
            onClick={enable}
            disabled={busy}
            className="h-12 w-full rounded-btn bg-accent text-base font-semibold text-surface disabled:opacity-60"
          >
            {busy ? "Turning on…" : "Turn on notifications"}
          </button>
          <button
            onClick={close}
            className="h-11 w-full rounded-btn text-sm font-semibold text-body-2"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
