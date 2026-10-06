"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Compass } from "lucide-react";
import { SpotlightTour, type TourStep } from "@/components/tour/SpotlightTour";
import { isStandalone } from "@/lib/pwa";

function WelcomeTourInner({
  steps,
  storageKey,
}: {
  steps: TourStep[];
  storageKey: string;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<"idle" | "modal" | "tour">("idle");
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    setStandalone(isStandalone());
  }, []);

  // Drop the "add to home screen" step once they're already in the app.
  const tourSteps = standalone ? steps.filter((s) => !s.install) : steps;

  useEffect(() => {
    if (params.get("welcome") !== "1") return;
    let seen = false;
    try {
      seen = localStorage.getItem(storageKey) === "1";
    } catch {
      /* ignore */
    }
    if (seen) {
      router.replace(pathname);
      return;
    }
    // Let the page paint before dimming it.
    const t = setTimeout(() => setPhase("modal"), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
    setPhase("idle");
    router.replace(pathname);
  }

  if (phase === "idle") return null;
  if (phase === "tour") return <SpotlightTour steps={tourSteps} onClose={dismiss} />;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-6">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-6 text-center shadow-sheet">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-pill bg-accent-soft text-accent">
          <Compass size={26} strokeWidth={2} aria-hidden />
        </span>
        <h2 className="mt-4 font-display text-2xl font-bold text-ink">
          Let us show you around
        </h2>
        <p className="mt-2 text-[15px] text-body-2">
          A 30-second tour of how everything works.
        </p>
        <div className="mt-6 space-y-2.5">
          <button
            onClick={() => setPhase("tour")}
            className="h-12 w-full rounded-btn bg-accent text-base font-semibold text-surface"
          >
            Take the quick tour
          </button>
          <button
            onClick={dismiss}
            className="h-11 w-full rounded-btn text-sm font-semibold text-body-2"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

export function WelcomeTour(props: { steps: TourStep[]; storageKey: string }) {
  return (
    <Suspense fallback={null}>
      <WelcomeTourInner {...props} />
    </Suspense>
  );
}
