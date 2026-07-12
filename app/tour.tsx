"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { enablePush, pushSupported } from "@/lib/push";

// First-run onboarding. Auto-opens once per account (tracked in localStorage so
// it needs no schema change) and can be replayed anytime from the header "?".
// It walks a new member through setting up their profile and how the app works,
// with in-card previews of Chat and Profile plus one-tap install / notifications
// / invite actions.

type Kind =
  | "profile"
  | "ring"
  | "streaks"
  | "chat"
  | "profileview"
  | "install"
  | "notifications"
  | "invite"
  | "done";

const DECK: Kind[] = [
  "profile",
  "ring",
  "streaks",
  "chat",
  "profileview",
  "install",
  "notifications",
  "invite",
  "done",
];

// A neon progress ring, matching the roster avatars, used as a card visual.
function NeonRing({ size = 66 }: { size?: number }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg className="tour-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={c} cy={c} r={r} className="tour-ring-bg" strokeWidth={stroke} fill="none" />
      <circle
        cx={c}
        cy={c}
        r={r}
        className="tour-ring-fg"
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={circ}
        strokeDashoffset={circ * 0.32}
        strokeLinecap="round"
        transform={`rotate(-90 ${c} ${c})`}
      />
    </svg>
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
  const key = `gb_tour_done_${userId}`;

  // Profile-setup state.
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [bio, setBio] = useState("");
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [pErr, setPErr] = useState<string | null>(null);

  // Environment + action state.
  const [isIOS, setIsIOS] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [notifState, setNotifState] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState("");

  useEffect(() => {
    setMounted(true);
    const ua = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));
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
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
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
  const first = i === 0;

  function nextLabel() {
    if (last) return "Get started";
    if (first) return "Show me around →";
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
          ▶ Replay the walkthrough
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

              {/* ---- Profile setup ---- */}
              {kind === "profile" && (
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
                    Add a profile picture so your crew knows it&apos;s you, and a
                    quick line about what you&apos;re working on.
                  </p>
                  <input
                    className="tour-bio"
                    value={bio}
                    maxLength={90}
                    placeholder="What are you working on?"
                    onChange={(e) => setBio(e.target.value)}
                    onBlur={saveBio}
                    aria-label="Bio"
                  />
                  {pErr && <p className="auth-error">{pErr}</p>}
                </>
              )}

              {/* ---- Ring ---- */}
              {kind === "ring" && (
                <>
                  <div className="tour-icon">
                    <NeonRing />
                  </div>
                  <h2 className="tour-title">Your ring is your day</h2>
                  <p className="tour-body">
                    Tap the ＋ button and check off what you did — each activity
                    fills the ring around your photo. Add a photo, voice note, or
                    caption if you like. Fill it all the way and the day&apos;s
                    complete.
                  </p>
                </>
              )}

              {/* ---- Streaks ---- */}
              {kind === "streaks" && (
                <>
                  <div className="tour-icon">🔥</div>
                  <h2 className="tour-title">Streaks reward showing up</h2>
                  <p className="tour-body">
                    Log everything in a day and it counts toward your streak.
                    Miss one and the ring won&apos;t close — but a day you&apos;ve
                    already won stays won, even if new activities get added later.
                  </p>
                </>
              )}

              {/* ---- Chat preview ---- */}
              {kind === "chat" && (
                <>
                  <div className="tour-preview tour-chat-preview">
                    <div className="tcp-row">
                      <span className="tcp-avatar">A</span>
                      <span className="tcp-bubble">Big day everyone 💪</span>
                    </div>
                    <div className="tcp-row mine">
                      <span className="tcp-bubble mine">On it 🔥</span>
                    </div>
                  </div>
                  <h2 className="tour-title">Chat with the crew</h2>
                  <p className="tour-body">
                    The Chat tab is for banter, ideas, and hype — send messages,
                    photos, and voice notes. It&apos;s the outlet once you&apos;re
                    done logging for the day.
                  </p>
                </>
              )}

              {/* ---- Profile preview ---- */}
              {kind === "profileview" && (
                <>
                  <div className="tour-preview tour-profile-preview">
                    <span className="tpp-avatar">
                      {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview} alt="" />
                      ) : (
                        displayName.trim().charAt(0).toUpperCase() || "?"
                      )}
                    </span>
                    <div className="tpp-tiles">
                      <span className="tpp-tile">🔥 Streak</span>
                      <span className="tpp-tile">🏅 Best</span>
                      <span className="tpp-tile">📅 Month</span>
                    </div>
                  </div>
                  <h2 className="tour-title">Your profile</h2>
                  <p className="tour-body">
                    My Profile is your history — current and best streaks, this
                    month, all-time, and every update you&apos;ve posted. Change
                    your photo or bio there anytime.
                  </p>
                </>
              )}

              {/* ---- Install ---- */}
              {kind === "install" && (
                <>
                  <div className="tour-icon">📲</div>
                  <h2 className="tour-title">Add it to your home screen</h2>
                  {standalone ? (
                    <p className="tour-body">
                      You&apos;re all set — the app is already installed. 🎉
                    </p>
                  ) : isIOS ? (
                    <p className="tour-body">
                      Tap the <b>Share</b> button, then{" "}
                      <b>Add to Home Screen</b>. It&apos;ll open like a real app —
                      full screen, with its own icon.
                    </p>
                  ) : (
                    <p className="tour-body">
                      Open your browser menu and tap <b>Install app</b> (or{" "}
                      <b>Add to Home Screen</b>) for one-tap access with its own
                      icon.
                    </p>
                  )}
                </>
              )}

              {/* ---- Notifications ---- */}
              {kind === "notifications" && (
                <>
                  <div className="tour-icon">🔔</div>
                  <h2 className="tour-title">Stay in the loop</h2>
                  <p className="tour-body">
                    Get a nudge when your crew posts, reacts, or messages — so you
                    never miss a day or leave someone hanging.
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
                    Accountability works better together. Anyone with your link
                    can join {groupName}.
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
                    Tap the ＋ to log your first day. You can replay this anytime
                    from the “?” at the top of the board.
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
