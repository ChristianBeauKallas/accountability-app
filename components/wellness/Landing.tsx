"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RunnerMark } from "./Runner";

// Product name shown in the sales copy. Placeholder — easy to rename.
const PRODUCT = "Stride";

const RULES = [
  {
    n: "01",
    title: "Days per month",
    body: "How many days a teammate logs movement to qualify.",
  },
  {
    n: "02",
    title: "Minutes per day",
    body: "How long they need to move for a day to count.",
  },
  {
    n: "03",
    title: "Wellness hours",
    body: "Hours they bank each month they hit the goal — used as sick time.",
  },
  {
    n: "04",
    title: "Monthly bonus",
    body: "The cash they earn each month they hit the goal.",
  },
];

export function Landing() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0 hero · 1 what-it-is · 2 the rules

  return (
    <main
      className="relative flex min-h-dvh flex-col overflow-hidden"
      style={{
        background:
          "radial-gradient(135% 85% at 50% -5%, rgb(var(--c-accent-soft)), transparent 58%)",
      }}
    >
      <div
        className="animate-glow pointer-events-none absolute left-1/2 top-[-70px] h-[300px] w-[300px] -translate-x-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, rgb(var(--c-accent)), transparent 68%)",
          filter: "blur(8px)",
          opacity: 0.14,
        }}
      />

      {step === 0 ? (
        /* ---------- hero ---------- */
        <div className="relative z-10 flex flex-1 flex-col px-[30px] pb-9 pt-12 text-center">
          <div className="font-display text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            {PRODUCT}
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-7">
            <RunnerMark tile={80} icon={40} radius={25} halo bob />
            <h1 className="font-display text-[2.35rem] font-bold leading-[1.04] tracking-tight text-ink">
              Move together.
              <br />
              <span className="text-accent">Earn together.</span>
            </h1>
          </div>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex h-[52px] w-full items-center justify-center rounded-cta bg-accent font-display font-semibold text-surface transition-colors hover:bg-accent-dark"
            >
              Check out how it works
            </button>
            <Link
              href="/login"
              className="p-1.5 font-semibold text-body-2 transition-colors hover:text-accent"
            >
              Log in
            </Link>
          </div>
        </div>
      ) : (
        /* ---------- explainer ---------- */
        <div className="relative z-10 flex flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-3 px-5 pb-1 pt-4">
            <button
              onClick={() => setStep((s) => s - 1)}
              aria-label="Back"
              className="grid h-[30px] w-[30px] place-items-center rounded-[9px] border border-border bg-surface text-ink"
            >
              ‹
            </button>
            <div className="flex gap-1.5">
              {[1, 2].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full ${i <= step ? "bg-accent" : "bg-track"}`}
                />
              ))}
            </div>
          </div>

          <div key={step} className="animate-tour-screen flex flex-1 flex-col px-[26px] pb-7 pt-3">
            {step === 1 ? (
              <>
                <div className="flex flex-1 flex-col justify-center gap-4">
                  <RunnerMark tile={56} icon={28} radius={18} />
                  <div className="font-display text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-accent">
                    How it works
                  </div>
                  <h2 className="font-display text-[1.65rem] font-bold leading-[1.15] tracking-tight text-ink">
                    Set the targets. Reward the effort.
                  </h2>
                  <p className="text-[0.98rem] leading-relaxed text-body-2">
                    <b className="text-ink">{PRODUCT}</b> is a wellness incentive program for
                    small and midsize businesses. You set simple movement targets for your team —
                    and every month they hit them, they earn <b className="text-ink">wellness hours</b>{" "}
                    and a <b className="text-ink">cash bonus</b>.
                  </p>
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="flex h-[52px] items-center justify-center rounded-cta bg-accent font-display font-semibold text-surface transition-colors hover:bg-accent-dark"
                >
                  Show me the deets
                </button>
              </>
            ) : (
              <>
                <div className="font-display text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-accent">
                  What you set
                </div>
                <h2 className="mt-1.5 font-display text-[1.65rem] font-bold leading-[1.15] tracking-tight text-ink">
                  You decide the rules.
                </h2>
                <div className="mt-5 flex flex-col gap-3">
                  {RULES.map((r) => (
                    <div
                      key={r.n}
                      className="flex items-start gap-3.5 rounded-card border border-border bg-surface p-3.5 shadow-card"
                    >
                      <span className="font-display text-[1.05rem] font-bold text-accent">{r.n}</span>
                      <div>
                        <div className="font-display text-[0.98rem] font-bold text-ink">
                          {r.title}
                        </div>
                        <div className="text-[0.82rem] leading-snug text-body-2">{r.body}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-center text-[0.8rem] text-muted">
                  Takes about a minute. Change anything later.
                </p>
                <div className="flex-1" />
                <button
                  onClick={() => router.push("/setup")}
                  className="mt-4 flex h-[52px] items-center justify-center rounded-cta bg-accent font-display font-semibold text-surface transition-colors hover:bg-accent-dark"
                >
                  Got it — create my group
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
