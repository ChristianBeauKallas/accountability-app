"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RunnerMark } from "./Runner";

const PRODUCT = "wlns";

const RULES = [
  { n: "01", title: "Days per month", body: "Days they move to qualify." },
  { n: "02", title: "Minutes per day", body: "How long counts toward a day." },
  { n: "03", title: "Wellness hours", body: "Banked monthly — used as sick time." },
  { n: "04", title: "Monthly bonus", body: "Cash for hitting the goal." },
];

type Slide = {
  eyebrow: string;
  title: string;
  body?: string;
  rules?: boolean;
  mark?: boolean;
  cta: string;
};

const SLIDES: Slide[] = [
  {
    eyebrow: "How it works",
    title: "Move more.\nEarn more.",
    body: "wlns turns your team's everyday movement into monthly rewards.",
    mark: true,
    cta: "Next",
  },
  {
    eyebrow: "The payoff",
    title: "Hit the goal,\nevery month.",
    body: "They earn wellness hours — use them as sick time — plus a cash bonus.",
    cta: "Next",
  },
  {
    eyebrow: "What you set",
    title: "You decide\nthe rules.",
    rules: true,
    cta: "Create my group",
  },
];

export function Landing() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0 = hero, 1..N = slide N

  const advance = () => {
    if (step < SLIDES.length) setStep(step + 1);
    else router.push("/setup");
  };
  const back = () => setStep((s) => s - 1);

  const slide = step > 0 ? SLIDES[step - 1] : null;

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
          <div className="font-display text-base font-bold tracking-[0.04em] text-accent">
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
              See how it works
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
              onClick={back}
              aria-label="Back"
              className="grid h-[30px] w-[30px] place-items-center rounded-[9px] border border-border bg-surface text-ink"
            >
              ‹
            </button>
            <div className="flex gap-1.5">
              {SLIDES.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full ${i < step ? "bg-accent" : "bg-track"}`}
                />
              ))}
            </div>
          </div>

          <div key={step} className="animate-tour-screen flex flex-1 flex-col px-[26px] pb-7 pt-3">
            {slide!.rules ? (
              <>
                <div className="font-display text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-accent">
                  {slide!.eyebrow}
                </div>
                <h2 className="mt-1.5 whitespace-pre-line font-display text-[1.9rem] font-bold leading-[1.08] tracking-tight text-ink">
                  {slide!.title}
                </h2>
                <div className="mt-5 flex flex-col gap-2.5">
                  {RULES.map((r) => (
                    <div
                      key={r.n}
                      className="flex items-center gap-3.5 rounded-card border border-border bg-surface p-3.5 shadow-card"
                    >
                      <span className="font-display text-[1.05rem] font-bold text-accent">{r.n}</span>
                      <div>
                        <div className="font-display text-[0.98rem] font-bold leading-tight text-ink">
                          {r.title}
                        </div>
                        <div className="text-[0.82rem] leading-snug text-muted">{r.body}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex-1" />
                <button
                  onClick={advance}
                  className="mt-5 flex h-[52px] items-center justify-center rounded-cta bg-accent font-display font-semibold text-surface transition-colors hover:bg-accent-dark"
                >
                  {slide!.cta}
                </button>
              </>
            ) : (
              <>
                <div className="flex flex-1 flex-col justify-center gap-5">
                  {slide!.mark && <RunnerMark tile={56} icon={28} radius={18} />}
                  <div>
                    <div className="font-display text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-accent">
                      {slide!.eyebrow}
                    </div>
                    <h2 className="mt-2 whitespace-pre-line font-display text-[2.4rem] font-bold leading-[1.02] tracking-tight text-ink">
                      {slide!.title}
                    </h2>
                  </div>
                  <p className="text-[1.05rem] leading-relaxed text-body-2">{slide!.body}</p>
                </div>
                <button
                  onClick={advance}
                  className="flex h-[52px] items-center justify-center rounded-cta bg-accent font-display font-semibold text-surface transition-colors hover:bg-accent-dark"
                >
                  {slide!.cta}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
