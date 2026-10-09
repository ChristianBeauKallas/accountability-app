"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { BaseballIcon } from "@/components/ui/BaseballIcon";

type Stop = {
  key: string;
  path: string;
  eyebrow: string;
  title: string;
  body: string;
};

// The cross-app leg of the coach walkthrough, continuing from the program
// page. Each stop is a real page; "Next" navigates to the next one via a
// ?tour= param, and the final stop offers to walk them through their first
// need. Activates only when the ?tour param is present (set by the flow),
// so players and normal visits never see it.
const STOPS: Stop[] = [
  {
    key: "inbox",
    path: "/inbox",
    eyebrow: "Inbox",
    title: "Where players land",
    body: "Once a player shows interest in one of your open needs, they'll show up here — ranked best-fit first.",
  },
  {
    key: "following",
    path: "/following",
    eyebrow: "Following",
    title: "Your shortlist",
    body: "Players you mark interested get saved here, so you can keep tabs on the ones you want.",
  },
  {
    key: "needs",
    path: "/needs",
    eyebrow: "Needs",
    title: "Where it all starts",
    body: "This is where you create your specific, targeted opportunities for players to see.",
  },
];

export function AppTour() {
  const router = useRouter();
  const pathname = usePathname();
  const [tourKey, setTourKey] = useState<string | null>(null);
  const [finalPrompt, setFinalPrompt] = useState(false);

  // Re-read the ?tour param on every navigation (each stop is its own path).
  useEffect(() => {
    try {
      setTourKey(new URLSearchParams(window.location.search).get("tour"));
    } catch {
      setTourKey(null);
    }
    setFinalPrompt(false);
  }, [pathname]);

  const stopIndex = STOPS.findIndex((s) => s.key === tourKey);
  const stop = stopIndex >= 0 ? STOPS[stopIndex] : null;
  const active = !!stop && pathname === stop!.path;

  if (!active || !stop) return null;
  const last = stopIndex === STOPS.length - 1;

  function go(to: string) {
    router.push(to);
  }
  function next() {
    if (!last) {
      const n = STOPS[stopIndex + 1];
      go(`${n.path}?tour=${n.key}`);
    } else {
      setFinalPrompt(true);
    }
  }
  function back() {
    if (stopIndex > 0) {
      const p = STOPS[stopIndex - 1];
      go(`${p.path}?tour=${p.key}`);
    }
  }
  function endTour(startNeed: boolean) {
    try {
      localStorage.setItem("athletx-tour-app", "1");
    } catch {
      /* ignore */
    }
    if (startNeed) router.push("/needs/new?welcome=1");
    else router.replace(pathname);
  }

  // Final "walk you through your first need?" prompt (centered).
  if (finalPrompt) {
    return (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center px-6"
        role="dialog"
        aria-modal="true"
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative w-full max-w-[20rem] animate-tour-screen rounded-card border border-border bg-surface p-6 text-center shadow-sheet">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-pill bg-accent-soft text-accent">
            <BaseballIcon size={26} strokeWidth={2} aria-hidden />
          </div>
          <h3 className="font-display text-xl font-bold leading-tight text-ink">
            That&rsquo;s the tour! 🎉
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-body-2">
            Want us to walk you through posting your first recruiting need?
          </p>
          <button
            onClick={() => endTour(true)}
            className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-btn bg-accent px-4 py-3 text-sm font-semibold text-surface"
          >
            Yes, let&rsquo;s do it
            <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
          </button>
          <button
            onClick={() => endTour(false)}
            className="mt-2 w-full py-1.5 text-center text-sm font-semibold text-muted-2"
          >
            I&rsquo;ll explore first
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
      {/* soft scrim so the card reads over the real page without hiding it */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 h-60 bg-gradient-to-t from-black/55 to-transparent"
        aria-hidden
      />
      <div className="fixed inset-x-0 bottom-0 flex justify-center px-4 pb-[calc(16px+env(safe-area-inset-bottom)+84px)]">
        <div className="relative w-full max-w-app animate-tour-screen rounded-card border border-border bg-surface p-4 shadow-sheet">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-eyebrow text-muted-2">
              {stop.eyebrow}
            </span>
            <button
              onClick={() => endTour(false)}
              className="text-xs font-semibold text-muted-2 hover:text-ink"
            >
              Skip
            </button>
          </div>
          <h3 className="mt-2 font-display text-lg font-semibold leading-tight text-ink">
            {stop.title}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-body-2">{stop.body}</p>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex gap-1.5">
              {STOPS.map((_, k) => (
                <span
                  key={k}
                  className={
                    "h-1.5 rounded-pill transition-all " +
                    (k === stopIndex ? "w-5 bg-accent" : "w-1.5 bg-border")
                  }
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {stopIndex > 0 && (
                <button
                  onClick={back}
                  className="rounded-btn px-3 py-2 text-sm font-semibold text-body-2"
                >
                  Back
                </button>
              )}
              <button
                onClick={next}
                className="inline-flex items-center gap-1.5 rounded-btn bg-accent px-4 py-2 text-sm font-semibold text-surface"
              >
                {last ? "Finish" : "Next"}
                <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
