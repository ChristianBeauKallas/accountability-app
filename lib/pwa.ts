// Small helpers for "add to home screen" / installed-app detection.

export type Platform = "ios" | "android" | "other";

// True when the page is running as an installed PWA (launched from the
// home-screen icon) rather than in a browser tab.
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mql = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean })
    .standalone;
  return !!mql || iosStandalone === true;
}

export function getPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as MacIntel but is touch-capable
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

// Chrome/Android fires `beforeinstallprompt` once, early. We stash it so a
// later "Install" button can trigger the native prompt.
type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __athletxInstallEvent?: BIPEvent | null;
  }
}

export function captureInstallEvent() {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    window.__athletxInstallEvent = e as BIPEvent;
  });
  window.addEventListener("appinstalled", () => {
    window.__athletxInstallEvent = null;
  });
}

export function getInstallEvent(): BIPEvent | null {
  if (typeof window === "undefined") return null;
  return window.__athletxInstallEvent ?? null;
}
