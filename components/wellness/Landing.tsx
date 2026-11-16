"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RunnerIcon, RunnerMark } from "./Runner";

const RULES = [
  { n: "01", title: "Days per month", body: "How many days someone exercises to qualify that month." },
  { n: "02", title: "Minutes per day", body: "The shortest workout that counts — sessions can add up." },
  { n: "03", title: "Wellness hours", body: "Paid time they bank each month, usable as sick days." },
  { n: "04", title: "Monthly bonus", body: "Cash added to their paycheck for hitting the goal." },
];

type Slide = {
  variant: "text" | "rules" | "culture";
  eyebrow: string;
  title: string;
  body?: string;
  mark?: boolean;
  note?: string;
  cta: string;
};

const SLIDES: Slide[] = [
  {
    variant: "text",
    eyebrow: "The problem",
    title: "Benefits favor\nthe big guys.",
    body: "Big companies can offer comprehensive benefits a small team can't match. On a tighter budget, real perks are hard to come by.",
    cta: "So what's the fix?",
  },
  {
    variant: "text",
    mark: true,
    eyebrow: "The idea",
    title: "Reward healthy\nhabits.",
    body: "Each month you set a simple goal, like exercising a set number of days. Anyone who hits it earns paid wellness hours plus a cash bonus. Walks, home workouts, the gym, a bike ride — it all qualifies, so there's nothing for them to buy.",
    cta: "How does it work?",
  },
  {
    variant: "rules",
    eyebrow: "You're in control",
    title: "You set the rules.",
    body: "The whole program runs on four simple settings. Pick them once, and change them whenever you want.",
    cta: "What's the best part?",
  },
  {
    variant: "culture",
    eyebrow: "The best part",
    title: "Build the culture.",
    body: "Everyone shares a quick check-in. Momentum builds — and people keep each other going.",
    note: "Free to set up · about a minute.",
    cta: "Create my group",
  },
];

export function Landing() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0 = hero, 1..N = slide N

  const advance = () => (step < SLIDES.length ? setStep(step + 1) : router.push("/setup"));
  const back = () => setStep((s) => s - 1);
  const slide = step > 0 ? SLIDES[step - 1] : null;

  const Cta = ({ label, className = "" }: { label: string; className?: string }) => (
    <button
      onClick={advance}
      className={`flex h-[52px] w-full items-center justify-center rounded-cta bg-accent font-display font-semibold text-surface transition-colors hover:bg-accent-dark ${className}`}
    >
      {label}
    </button>
  );

  return (
    <main
      className="relative flex h-dvh flex-col overflow-hidden"
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
          <div className="flex flex-col items-center gap-0.5">
            <div className="font-display text-base font-bold tracking-[0.04em] text-accent">wlns</div>
            <div className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-muted">
              Team wellness, made simple
            </div>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <RunnerMark tile={80} icon={40} radius={25} halo bob />
            <div>
              <h1 className="whitespace-pre-line font-display text-[1.95rem] font-bold leading-[1.1] tracking-tight text-ink">
                {"The wellness incentive\nfor small to medium teams."}
              </h1>
              <p className="mx-auto mt-3.5 max-w-[18rem] text-[0.95rem] leading-snug text-body-2">
                Reward your team&apos;s healthy habits with wellness hours and cash bonuses.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <Cta label="See how it works" />
            <Link href="/login" className="p-1.5 font-semibold text-body-2 transition-colors hover:text-accent">
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
                <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < step ? "bg-accent" : "bg-track"}`} />
              ))}
            </div>
          </div>

          <div key={step} className="flex-1 overflow-y-auto">
            <div className="animate-tour-screen flex min-h-full flex-col px-[26px] pb-7 pt-5">
              {slide!.mark && <RunnerMark tile={56} icon={28} radius={18} className="mb-5" />}

              <div className="font-display text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-accent">
                {slide!.eyebrow}
              </div>
              <h2 className="mt-2 whitespace-pre-line font-display text-[2.1rem] font-bold leading-[1.07] tracking-tight text-ink">
                {slide!.title}
              </h2>
              {slide!.body && (
                <p className="mt-4 text-[1.02rem] leading-relaxed text-body-2">{slide!.body}</p>
              )}

              {slide!.variant === "rules" && (
                <>
                  <div className="mt-5 flex flex-col gap-2.5">
                    {RULES.map((r) => (
                      <div key={r.n} className="flex items-center gap-3.5 rounded-card border border-border bg-surface p-3.5 shadow-card">
                        <span className="font-display text-[1.05rem] font-bold text-accent">{r.n}</span>
                        <div>
                          <div className="font-display text-[0.98rem] font-bold leading-tight text-ink">{r.title}</div>
                          <div className="text-[0.82rem] leading-snug text-muted">{r.body}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-card border border-accent/30 bg-accent-soft p-3.5">
                    <div className="mb-1 font-display text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-accent">For example</div>
                    <p className="text-[0.86rem] leading-snug text-body-2">
                      Exercise <b className="text-ink">12 days</b> of <b className="text-ink">30+ min</b> a month → earn{" "}
                      <b className="text-ink">4 wellness hours</b> + <b className="text-ink">$50</b>.
                    </p>
                  </div>
                </>
              )}

              {slide!.variant === "culture" && <FeedPeek />}

              <div className="min-h-[24px] flex-1" />
              {slide!.note && <p className="mb-2.5 text-center text-[0.8rem] text-muted">{slide!.note}</p>}
              <Cta label={slide!.cta} />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* An actual-looking snippet of the in-app team feed — the "culture" proof.
   Mirrors the real feed card in app/feed/page.tsx. */
function FeedPeek() {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="inline-flex items-center gap-1.5 font-display text-xs font-bold text-ink">
          <span className="grid h-5 w-5 place-items-center rounded-[6px] bg-gradient-to-br from-accent to-accent-dark text-white">
            <RunnerIcon size={12} strokeWidth={2.2} />
          </span>
          Today
        </span>
        <span className="text-[0.62rem] text-muted">Your team</span>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2.5 pb-2.5">
          <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-full font-display text-[0.66rem] font-bold text-white" style={{ background: "#b4552f" }}>
            SM
          </span>
          <div className="min-w-0">
            <div className="text-[0.82rem] font-bold leading-tight text-ink">Sarah Mitchell</div>
            <div className="text-[0.68rem] text-muted">22m ago</div>
          </div>
        </div>
        <div className="relative h-36 overflow-hidden rounded-xl bg-gradient-to-br from-amber-300 via-orange-400 to-sky-500">
          <span className="absolute right-2 top-2 rounded-pill bg-black/60 px-2 py-[3px] font-display text-[0.68rem] font-bold text-white backdrop-blur">
            50m
          </span>
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-pill bg-black/60 px-2 py-[3px] text-[0.68rem] font-semibold text-white backdrop-blur">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Lifetime Fitness
          </span>
        </div>
        <div className="pt-2.5 text-[0.82rem] leading-snug text-body-2">
          <b className="text-ink">Sarah</b> Leg day before the kids woke up.
        </div>
      </div>
    </div>
  );
}
