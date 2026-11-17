"use client";

import { useRouter } from "next/navigation";
import { TOUR_KEY } from "./AppTour";

export function ReplayTutorial() {
  const router = useRouter();
  function replay() {
    try {
      localStorage.removeItem(TOUR_KEY);
    } catch {
      /* ignore */
    }
    router.push("/feed?tour=feed");
  }
  return (
    <button onClick={replay} className="w-full p-1.5 text-center text-sm font-semibold text-muted transition-colors hover:text-accent">
      Replay the walkthrough
    </button>
  );
}
