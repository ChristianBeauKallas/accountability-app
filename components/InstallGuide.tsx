"use client";

import { useState } from "react";
import {
  Share,
  Plus,
  MoreVertical,
  MonitorDown,
  Check,
  X,
  type LucideIcon,
} from "lucide-react";
import { getPlatform, getInstallEvent } from "@/lib/pwa";

// A single numbered step. The filled number badge makes the sequence obvious.
function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-surface">
        {n}
      </span>
      <span className="pt-0.5 text-[15px] leading-snug text-body-2">{children}</span>
    </li>
  );
}

// An OS glyph shown inline next to the word it names, so coaches recognize the
// exact icon to tap (the Share box, the ⋮ menu, the address-bar install icon).
function Glyph({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="mx-0.5 inline-flex h-5 w-5 translate-y-[3px] items-center justify-center rounded bg-chip text-ink">
      <Icon size={13} strokeWidth={2.25} aria-hidden />
    </span>
  );
}

function OrDivider() {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-divider" />
      <span className="text-xs font-medium uppercase tracking-wide text-muted-2">
        or step by step
      </span>
      <span className="h-px flex-1 bg-divider" />
    </div>
  );
}

// Platform-aware "add to home screen" instructions. iOS can only be walked
// through the Share sheet; Android/desktop can offer a one-tap install.
export function InstallGuide() {
  const platform = getPlatform();
  const [done, setDone] = useState(false);
  const evt = getInstallEvent();

  async function oneTap() {
    if (!evt) return;
    await evt.prompt();
    const choice = await evt.userChoice;
    if (choice.outcome === "accepted") setDone(true);
  }

  if (done) {
    return (
      <p className="flex items-center gap-2 text-[15px] font-semibold text-accent">
        <Check size={18} strokeWidth={2.5} aria-hidden />
        Added — look for Athletx on your home screen.
      </p>
    );
  }

  if (platform === "ios") {
    return (
      <ol className="space-y-3.5">
        <Step n={1}>
          Tap the <span className="font-semibold text-ink">Share</span> icon
          <Glyph icon={Share} /> in Safari&rsquo;s toolbar (the bar at the bottom
          of the screen).
        </Step>
        <Step n={2}>
          Scroll down and tap{" "}
          <span className="font-semibold text-ink">Add to Home Screen</span>
          <Glyph icon={Plus} />.
        </Step>
        <Step n={3}>
          Tap <span className="font-semibold text-ink">Add</span> in the top
          corner — then open Athletx from your home screen like any other app.
        </Step>
      </ol>
    );
  }

  if (platform === "android") {
    return (
      <div className="space-y-4">
        {evt && (
          <>
            <button
              onClick={oneTap}
              className="h-12 w-full rounded-btn bg-accent text-base font-semibold text-surface"
            >
              Install Athletx
            </button>
            <OrDivider />
          </>
        )}
        <ol className="space-y-3.5">
          <Step n={1}>
            Tap the <span className="font-semibold text-ink">menu</span>
            <Glyph icon={MoreVertical} /> in the top-right of Chrome.
          </Step>
          <Step n={2}>
            Tap <span className="font-semibold text-ink">Install app</span> (or{" "}
            <span className="font-semibold text-ink">Add to Home screen</span>).
          </Step>
          <Step n={3}>
            Tap <span className="font-semibold text-ink">Install</span> to confirm
            — then open Athletx from your home screen.
          </Step>
        </ol>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {evt && (
        <>
          <button
            onClick={oneTap}
            className="h-12 w-full rounded-btn bg-accent text-base font-semibold text-surface"
          >
            Install Athletx
          </button>
          <OrDivider />
        </>
      )}
      <ol className="space-y-3.5">
        <Step n={1}>
          Click the <span className="font-semibold text-ink">install icon</span>
          <Glyph icon={MonitorDown} /> at the right end of the address bar — or
          open the browser <span className="font-semibold text-ink">menu</span>
          <Glyph icon={MoreVertical} /> if you don&rsquo;t see it.
        </Step>
        <Step n={2}>
          Choose <span className="font-semibold text-ink">Install Athletx</span>.
        </Step>
        <Step n={3}>
          Click <span className="font-semibold text-ink">Install</span> — Athletx
          opens in its own window.
        </Step>
      </ol>
    </div>
  );
}

// Standalone modal wrapper for the ⋯ menu entry.
export function InstallModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col justify-end bg-black/60"
      onClick={onClose}
    >
      <div
        className="mx-auto w-full max-w-app rounded-t-[20px] bg-surface shadow-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-divider px-5 py-3">
          <span className="eyebrow">Add to home screen</span>
          <button onClick={onClose} className="text-muted" aria-label="Close">
            <X size={22} strokeWidth={2} />
          </button>
        </div>
        <div className="space-y-4 px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-5">
          <p className="text-[15px] leading-relaxed text-body-2">
            Athletx runs best saved to your home screen — it opens full-screen
            like a real app, and it&rsquo;s what makes coach alerts reliable.
          </p>
          <InstallGuide />
        </div>
      </div>
    </div>
  );
}
