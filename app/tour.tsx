"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { enablePush, pushSupported } from "@/lib/push";
import { flagKey, markTourDone, resetTours } from "@/lib/tours";

// First-run Welcome tour. Auto-opens once per account (tracked in localStorage
// and mirrored to profiles.onboarded_at so it sticks across devices) and can be
// replayed from Settings. It sets up the member's profile and frames the idea,
// then hands off: how posting/rings work is taught contextually the next time
// they open the board and when they post, so this stays short.

type Kind =
  | "photo"
  | "bio"
  | "idea"
  | "install"
  | "notifications"
  | "invite"
  | "done";

// Note: "invite" is intentionally left out of the first-run flow for now — we
// don't want new members inviting others yet. The card below is kept so it can
// be dropped back in here later. Invites still live in Settings.
const DECK: Kind[] = ["photo", "bio", "idea", "install", "notifications", "done"];

// The idea card's visual: a nearly-full ring with a streak chip, showing the
// payoff — fill your ring each day, grow a streak, all tracked on your profile.
function IdeaMock() {
  const size = 92;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="tour-idea-mock" aria-hidden>
      <span className="tim-ring">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={c}
            cy={c}
            r={r}
            className="tour-ring-bg"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={c}
            cy={c}
            r={r}
            className="tour-ring-fg"
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circ}
            strokeDashoffset={circ * 0.1}
            strokeLinecap="round"
            transform={`rotate(-90 ${c} ${c})`}
          />
        </svg>
        <span className="tim-check">✓</span>
      </span>
      <span className="tim-streak">🔥 7-day streak</span>
    </div>
  );
}

// The notifications card's visual: a mock push banner showing what a check-in
// alert looks like.
function NotifMock() {
  return (
    <div className="tour-notif-mock" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="tnm-icon" src="/icon-192.png" alt="" />
      <span className="tnm-text">
        <span className="tnm-app">Get Better · now</span>
        <span className="tnm-msg">Alex just checked in — 4 of 5 done 🔥</span>
      </span>
    </div>
  );
}

// The install card's visual: the GB icon sitting on a home screen.
function InstallMock() {
  return (
    <div className="tour-install-mock" aria-hidden>
      <span className="tis-slot" />
      <span className="tis-slot gb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" />
        <small>Get Better</small>
      </span>
      <span className="tis-slot" />
    </div>
  );
}

export default function Tour({
  userId,
  groupName,
  displayName,
  avatarUrl,
  inviteCode,
  initialSeen = false,
  autoOpen = true,
  trigger = "icon",
}: {
  userId: string;
  groupName: string;
  displayName: string;
  avatarUrl: string | null;
  inviteCode: string;
  initialSeen?: boolean;
  autoOpen?: boolean;
  trigger?: "icon" | "button" | "none";
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [i, setI] = useState(0);
  const key = flagKey("tour", userId);

  // Profile-setup state.
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [bio, setBio] = useState("");
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [pErr, setPErr] = useState<string | null>(null);

  // Environment + action state.
  const [standalone, setStandalone] = useState(false);
  const [notifState, setNotifState] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState("");

  useEffect(() => {
    setMounted(true);
    const nav = window.navigator as Navigator & { standalone?: boolean };
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        nav.standalone === true,
    );
    setLink(`${window.location.origin}/join/${inviteCode}`);
  }, [inviteCode]);

  // Auto-open the first time this account sees the board. The DB flag makes it
  // stick across devices; localStorage is a fast local fallback.
  useEffect(() => {
    if (!autoOpen || initialSeen) return;
    try {
      if (!localStorage.getItem(key)) setOpen(true);
    } catch {
      setOpen(true); // storage blocked — still show it the first time
    }
  }, [key, initialSeen, autoOpen]);

  function markSeen() {
    markTourDone("tour", userId);
    // Persist across devices (best-effort; column may not be migrated yet).
    createClient()
      .from("profiles")
      .update({ onboarded_at: new Date().toISOString() })
      .eq("id", userId)
      .then(() => {});
  }
  function close() {
    markSeen();
    setOpen(false);
    setI(0);
    // Let the install nudge know onboarding just finished.
    try {
      window.dispatchEvent(new Event("gb-tour-done"));
    } catch {
      /* ignore */
    }
  }
  function replay() {
    // Replaying from Settings resets the contextual walkthroughs too, so they
    // re-fire as the member revisits the board, their profile, and chat.
    resetTours(userId);
    setI(0);
    setOpen(true);
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSavingPhoto(true);
    setPErr(null);
    setPreview(URL.createObjectURL(file));
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/avatar", {
      method: "POST",
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      body: form,
    });
    setSavingPhoto(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setPErr(d.error ?? "Couldn't save photo — try again.");
    }
  }

  async function saveBio() {
    const trimmed = bio.trim();
    if (!trimmed) return;
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ bio: trimmed })
      .eq("id", userId);
  }

  async function turnOnNotifs() {
    setNotifState("Working…");
    const r = await enablePush(userId);
    if (r === "granted") setNotifState("You're all set 🔔");
    else if (r === "denied") setNotifState("No worries — enable later in settings.");
    else if (r === "unsupported")
      setNotifState("Install the app first, then turn these on.");
    else setNotifState("Couldn't enable — try again from settings.");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* selectable fallback */
    }
  }
  async function shareLink() {
    const nav = navigator as Navigator & {
      share?: (d: ShareData) => Promise<void>;
    };
    if (nav.share) {
      try {
        await nav.share({
          title: `Join ${groupName} on Get Better`,
          text: `Join "${groupName}" on Get Better:`,
          url: link,
        });
      } catch {
        /* cancelled */
      }
    } else copyLink();
  }

  const kind = DECK[i];
  const last = i === DECK.length - 1;

  function nextLabel() {
    if (last) return "Get started";
    if (kind === "bio") return "Show me around →";
    return "Next";
  }

  return (
    <>
      {trigger === "icon" && (
        <button
          type="button"
          className="head-icon"
          aria-label="How it works"
          onClick={replay}
        >
          ?
        </button>
      )}
      {trigger === "button" && (
        <button type="button" className="settings-replay" onClick={replay}>
          ▶ Replay the walkthroughs
        </button>
      )}

      {mounted &&
        open &&
        createPortal(
          <div className="tour-overlay" role="dialog" aria-modal="true">
            <div className="tour-card">
              <button
                type="button"
                className="tour-skip"
                onClick={close}
                aria-label="Skip walkthrough"
              >
                Skip
              </button>

              {/* ---- Profile photo ---- */}
              {kind === "photo" && (
                <>
                  <button
                    type="button"
                    className="tour-avatar-btn"
                    onClick={() => fileInput.current?.click()}
                    disabled={savingPhoto}
                    aria-label="Add a profile picture"
                  >
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="tour-avatar" src={preview} alt="" />
                    ) : (
                      <span className="tour-avatar fallback">
                        {displayName.trim().charAt(0).toUpperCase() || "?"}
                      </span>
                    )}
                    <span className="tour-avatar-badge">📷</span>
                  </button>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={onPhoto}
                  />
                  <h2 className="tour-title">Welcome to {groupName}</h2>
                  <p className="tour-body">
                    First, add a profile picture by tapping the circle so your
                    crew knows it&apos;s you.
                  </p>
                  {pErr && <p className="auth-error">{pErr}</p>}
                </>
              )}

              {/* ---- Bio ---- */}
              {kind === "bio" && (
                <>
                  <div className="tour-icon">✍️</div>
                  <h2 className="tour-title">What are you working on?</h2>
                  <p className="tour-body">
                    Include a short bio or line on what you&apos;re working
                    towards.
                  </p>
                  <input
                    className="tour-bio"
                    value={bio}
                    maxLength={90}
                    placeholder="e.g. Training for a half-marathon"
                    onChange={(e) => setBio(e.target.value)}
                    onBlur={saveBio}
                    aria-label="Bio"
                  />
                </>
              )}

              {/* ---- The idea ---- */}
              {kind === "idea" && (
                <>
                  <div className="tour-icon">
                    <IdeaMock />
                  </div>
                  <h2 className="tour-title">Here&apos;s the idea</h2>
                  <p className="tour-body">
                    Each day, log what you complete to fill your ring and grow
                    your streak — it all adds up on your profile. We&apos;ll show
                    you exactly how when you post your first one.
                  </p>
                </>
              )}

              {/* ---- Install ---- */}
              {kind === "install" && (
                <>
                  <div className="tour-icon">
                    <InstallMock />
                  </div>
                  <h2 className="tour-title">Add it to your home screen</h2>
                  {standalone ? (
                    <p className="tour-body">
                      You&apos;re all set — the app is already installed. 🎉
                    </p>
                  ) : (
                    <p className="tour-body">
                      Get Better works best as an app on your home screen — and
                      it&apos;s what powers notifications. We&apos;ll show you how
                      to set this up shortly.
                    </p>
                  )}
                </>
              )}

              {/* ---- Notifications ---- */}
              {kind === "notifications" && (
                <>
                  <div className="tour-icon">
                    <NotifMock />
                  </div>
                  <h2 className="tour-title">Turn on notifications</h2>
                  <p className="tour-body">
                    Get a nudge when your crew checks in, reacts, or messages — so
                    you never miss a day or leave someone hanging.
                  </p>
                  {pushSupported() ? (
                    <button
                      type="button"
                      className="tour-action"
                      onClick={turnOnNotifs}
                    >
                      Enable notifications
                    </button>
                  ) : (
                    <p className="tour-hint">
                      Install the app first, then you can turn these on.
                    </p>
                  )}
                  {notifState && <p className="tour-hint">{notifState}</p>}
                </>
              )}

              {/* ---- Invite ---- */}
              {kind === "invite" && (
                <>
                  <div className="tour-icon">🧑‍🤝‍🧑</div>
                  <h2 className="tour-title">Bring your crew</h2>
                  <p className="tour-body">
                    It works better together. Anyone with your link can join{" "}
                    {groupName}. You always have access to this link in the
                    settings icon.
                  </p>
                  <div className="tour-invite-row">
                    <input className="tour-invite-input" value={link} readOnly />
                    <button
                      type="button"
                      className="tour-invite-copy"
                      onClick={copyLink}
                    >
                      {copied ? "Copied ✓" : "Copy"}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="tour-action"
                    onClick={shareLink}
                  >
                    Share invite
                  </button>
                </>
              )}

              {/* ---- Done ---- */}
              {kind === "done" && (
                <>
                  <div className="tour-icon">🚀</div>
                  <h2 className="tour-title">You&apos;re all set</h2>
                  <p className="tour-body">
                    Tap the ＋ to log your first day — we&apos;ll walk you through
                    it. Replay this anytime from Settings.
                  </p>
                </>
              )}

              <div className="tour-dots">
                {DECK.map((_, d) => (
                  <span
                    key={d}
                    className={`tour-dot ${d === i ? "on" : ""}`}
                    aria-hidden
                  />
                ))}
              </div>

              <div className="tour-nav">
                {i > 0 ? (
                  <button
                    type="button"
                    className="tour-back"
                    onClick={() => setI((n) => n - 1)}
                  >
                    Back
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  className="tour-next"
                  onClick={() => (last ? close() : setI((n) => n + 1))}
                >
                  {nextLabel()}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
