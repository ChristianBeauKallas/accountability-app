"use client";

import { useState } from "react";
import { MessageSquare, X, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

const KINDS = [
  { value: "confusing", label: "Confusing" },
  { value: "stuck", label: "I'm stuck" },
  { value: "bug", label: "Something broke" },
  { value: "idea", label: "Idea" },
];

/**
 * Optional, always-available feedback tab for the test group. A thin side tab
 * opens a quick panel; submissions capture the current route + context so we
 * can see where people get stuck or confused. Writes to public.feedback.
 */
export function FeedbackNudge({ context }: { context?: string }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setKind("");
    setMessage("");
    setError("");
    setDone(false);
  }

  async function submit() {
    if (!kind && !message.trim()) {
      setError("Pick what's happening, or jot a quick note.");
      return;
    }
    setSending(true);
    setError("");
    const path = typeof window !== "undefined" ? window.location.pathname : null;
    const { error: err } = await supabase.from("feedback").insert({
      path,
      context: context ?? null,
      kind: kind || null,
      message: message.trim() || null,
    });
    setSending(false);
    if (err) {
      setError("Couldn't send — try again.");
      return;
    }
    setDone(true);
    setTimeout(() => {
      setOpen(false);
      reset();
    }, 1600);
  }

  return (
    <>
      {/* Side tab */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        className="fixed right-0 top-1/2 z-[60] flex -translate-y-1/2 items-center gap-1.5 rounded-l-xl bg-accent px-2 py-3 text-surface shadow-[0_6px_20px_rgba(0,0,0,0.4)]"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide [writing-mode:vertical-rl]">
          <MessageSquare size={14} strokeWidth={2.5} aria-hidden />
          Feedback
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 px-4 pb-[calc(16px+env(safe-area-inset-bottom))] sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setOpen(false);
            reset();
          }}
        >
          <div
            data-theme="dark"
            className="w-full max-w-sm rounded-card border border-border bg-surface p-5 shadow-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            {done ? (
              <div className="py-6 text-center">
                <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-pill bg-accent text-surface">
                  <Check size={24} strokeWidth={2.5} aria-hidden />
                </span>
                <p className="font-display text-lg font-bold text-ink">Thanks 🙏</p>
                <p className="mt-1 text-sm text-body-2">
                  This is exactly what helps us make it better.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold text-ink">
                    How&rsquo;s it going?
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      reset();
                    }}
                    className="text-muted"
                    aria-label="Close"
                  >
                    <X size={20} strokeWidth={2} />
                  </button>
                </div>
                <p className="mt-1 text-sm text-body-2">
                  Stuck or confused on something? Tell us where — it helps a ton.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {KINDS.map((k) => (
                    <button
                      key={k.value}
                      type="button"
                      onClick={() => setKind(kind === k.value ? "" : k.value)}
                      className={cn(
                        "h-9 rounded-pill px-3.5 text-sm font-semibold transition-colors",
                        kind === k.value
                          ? "bg-accent text-surface"
                          : "bg-chip text-body-2 hover:bg-accent-soft"
                      )}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="What happened? Where are you in the app?"
                  className="mt-3 w-full resize-none rounded-input border border-border bg-ground px-3 py-2.5 text-[15px] text-ink placeholder:text-muted-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                />

                {error && <p className="mt-2 text-sm text-danger">{error}</p>}

                <button
                  type="button"
                  onClick={submit}
                  disabled={sending}
                  className="mt-3 h-12 w-full rounded-btn bg-accent text-[15px] font-semibold text-surface transition-colors hover:bg-accent-dark disabled:opacity-60"
                >
                  {sending ? "Sending…" : "Send feedback"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
