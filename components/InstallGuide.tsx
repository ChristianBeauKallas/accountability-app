"use client";

import { useState } from "react";
import {
  Share,
  Plus,
  MoreVertical,
  Check,
  X,
  type LucideIcon,
} from "lucide-react";
import { getPlatform, getInstallEvent } from "@/lib/pwa";

function Step({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-accent-soft text-accent">
        <Icon size={18} strokeWidth={2} aria-hidden />
      </span>
      <span className="text-[15px] leading-snug text-body-2">{children}</span>
    </li>
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
      <ol className="space-y-3">
        <Step icon={Share}>
          Tap the <span className="font-semibold text-ink">Share</span> icon in
          Safari&rsquo;s toolbar.
        </Step>
        <Step icon={Plus}>
          Choose <span className="font-semibold text-ink">Add to Home Screen</span>.
        </Step>
        <Step icon={Check}>
          Tap <span className="font-semibold text-ink">Add</span> — and open
          Athletx like any other app.
        </Step>
      </ol>
    );
  }

  if (platform === "android") {
    return (
      <div className="space-y-4">
        {evt && (
          <button
            onClick={oneTap}
            className="h-12 w-full rounded-btn bg-accent text-base font-semibold text-surface"
          >
            Install Athletx
          </button>
        )}
        <ol className="space-y-3">
          <Step icon={MoreVertical}>
            Open the <span className="font-semibold text-ink">⋮</span> menu in
            Chrome.
          </Step>
          <Step icon={Plus}>
            Tap <span className="font-semibold text-ink">Install app</span> (or Add
            to Home screen).
          </Step>
          <Step icon={Check}>
            Confirm — and open Athletx like any other app.
          </Step>
        </ol>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {evt && (
        <button
          onClick={oneTap}
          className="h-12 w-full rounded-btn bg-accent text-base font-semibold text-surface"
        >
          Install Athletx
        </button>
      )}
      <ol className="space-y-3">
        <Step icon={Plus}>
          Click the install icon in your browser&rsquo;s address bar, or open the
          browser menu and choose{" "}
          <span className="font-semibold text-ink">Install Athletx</span>.
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
