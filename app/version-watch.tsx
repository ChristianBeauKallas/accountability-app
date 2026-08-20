"use client";

import { useEffect } from "react";

// Installed PWAs (especially iOS) resume a frozen page from memory instead of
// re-navigating, so a new deploy's CSS/JS never loads until the user manually
// reinstalls. This watches for that: whenever the app becomes visible, it asks
// the server for the current build id and reloads once if it changed.
export default function VersionWatch() {
  useEffect(() => {
    const mine = process.env.NEXT_PUBLIC_BUILD_ID || "dev";
    let reloading = false;

    async function check() {
      if (reloading || document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { v } = (await res.json()) as { v?: string };
        // Only act when both ids are real and genuinely differ.
        if (v && v !== "dev" && mine !== "dev" && v !== mine) {
          reloading = true;
          location.reload();
        }
      } catch {
        // Offline or transient — try again next time it's foregrounded.
      }
    }

    check();
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, []);
  return null;
}
