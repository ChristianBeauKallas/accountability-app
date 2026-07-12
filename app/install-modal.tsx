"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// A one-time, prominent nudge to install the PWA — shown right after the
// onboarding tour finishes, and only when the app isn't already installed.
// This is the step that actually enables notifications, so it's worth its own
// moment rather than being buried in the tour.
export default function InstallModal({
  userId,
  onboarded,
}: {
  userId: string;
  onboarded: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const key = "gb_install_seen";

  useEffect(() => {
    setMounted(true);
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      nav.standalone === true;
    if (standalone) return; // already installed — never nag

    setIsIOS(/iphone|ipad|ipod/.test(nav.userAgent.toLowerCase()));
    try {
      if (localStorage.getItem(key)) return; // already dismissed
    } catch {
      /* ignore */
    }

    const tourDone = () => {
      try {
        return !!localStorage.getItem(`gb_tour_done_${userId}`);
      } catch {
        return false;
      }
    };

    // If onboarding is already behind them, show shortly after they land.
    // Otherwise wait for the tour to finish so the two don't collide.
    if (onboarded || tourDone()) {
      const t = setTimeout(() => setShow(true), 700);
      return () => clearTimeout(t);
    }
    const onDone = () => setTimeout(() => setShow(true), 500);
    window.addEventListener("gb-tour-done", onDone);
    return () => window.removeEventListener("gb-tour-done", onDone);
  }, [userId, onboarded]);

  function close() {
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  if (!mounted || !show) return null;

  return createPortal(
    <div className="tour-overlay" role="dialog" aria-modal="true">
      <div className="tour-card">
        <div className="tour-icon">📲</div>
        <h2 className="tour-title">Add it to your home screen</h2>
        <p className="tour-body">
          The app works best installed — it&apos;s what turns on notifications so
          you never miss an update from the group.
        </p>
        <ol className="install-steps">
          {isIOS ? (
            <>
              <li>
                <span className="install-step-n">1</span>
                <span>
                  Tap the <b>Share</b> button (the square with an ↑) at the
                  bottom of Safari
                </span>
              </li>
              <li>
                <span className="install-step-n">2</span>
                <span>
                  Scroll down and tap <b>Add to Home Screen</b>
                </span>
              </li>
              <li>
                <span className="install-step-n">3</span>
                <span>
                  Open the app from its new icon, then tap the 🔔 to turn on
                  notifications
                </span>
              </li>
            </>
          ) : (
            <>
              <li>
                <span className="install-step-n">1</span>
                <span>
                  Open your browser menu <b>⋮</b>
                </span>
              </li>
              <li>
                <span className="install-step-n">2</span>
                <span>
                  Tap <b>Install app</b> (or <b>Add to Home Screen</b>)
                </span>
              </li>
              <li>
                <span className="install-step-n">3</span>
                <span>
                  Open the app from its new icon, then tap the 🔔 to turn on
                  notifications
                </span>
              </li>
            </>
          )}
        </ol>
        <div className="tour-nav">
          <span />
          <button type="button" className="tour-next" onClick={close}>
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
