"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import {
  pushSupported,
  isSubscribed,
  permission,
  enablePush,
} from "@/lib/push/client";

/** A nudge on the Notifications page to turn on browser/device push. */
export function PushPrompt() {
  const [state, setState] = useState<
    "hidden" | "off" | "blocked" | "busy" | "on"
  >("hidden");

  useEffect(() => {
    let active = true;
    (async () => {
      if (!pushSupported()) return;
      if (permission() === "denied") {
        if (active) setState("blocked");
        return;
      }
      const sub = await isSubscribed();
      if (active) setState(sub ? "on" : "off");
    })();
    return () => {
      active = false;
    };
  }, []);

  async function enable() {
    setState("busy");
    const ok = await enablePush();
    setState(ok ? "on" : permission() === "denied" ? "blocked" : "off");
  }

  if (state === "hidden" || state === "on") return null;

  return (
    <div className="mb-5 flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3.5 shadow-card">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-accent-soft text-accent">
        <BellRing size={20} strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-semibold leading-tight text-ink">
          Never miss a match
        </p>
        <p className="mt-0.5 text-sm text-body-2">
          {state === "blocked"
            ? "Notifications are blocked in your browser settings. Allow them to get alerts here."
            : "Get a push the moment a coach is interested or a new spot fits you."}
        </p>
      </div>
      {state !== "blocked" && (
        <button
          onClick={enable}
          disabled={state === "busy"}
          className="shrink-0 rounded-btn bg-accent px-3.5 py-2 text-sm font-semibold text-surface disabled:opacity-60"
        >
          {state === "busy" ? "…" : "Turn on"}
        </button>
      )}
    </div>
  );
}
