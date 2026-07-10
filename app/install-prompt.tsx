"use client";

import { useEffect, useState } from "react";

type BIPEvent = Event & {
  prompt: () => void;
  userChoice: Promise<{ outcome: string }>;
};

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      nav.standalone === true;
    if (standalone) return;
    if (sessionStorage.getItem("installDismissed")) return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    const ua = nav.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isSafari = isIOS && !/crios|fxios/.test(ua);
    if (isIOS && isSafari) {
      setIosHint(true);
      setHidden(false);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  function dismiss() {
    sessionStorage.setItem("installDismissed", "1");
    setHidden(true);
  }

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }

  if (hidden || (!deferred && !iosHint)) return null;

  return (
    <div className="install-banner">
      <span className="install-icon">🔥</span>
      {deferred ? (
        <>
          <span className="install-text">Install for one-tap access.</span>
          <button className="install-go" onClick={install}>
            Install
          </button>
        </>
      ) : (
        <span className="install-text">
          Install: tap <b>Share</b> → <b>Add to Home Screen</b>.
        </span>
      )}
      <button className="install-x" onClick={dismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
