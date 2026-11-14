"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RunnerIcon, RunnerMark } from "./Runner";

const RULES = [
  { n: "01", title: "Days per month", body: "Days they move to qualify." },
  { n: "02", title: "Minutes per day", body: "How long counts toward a day." },
  { n: "03", title: "Wellness hours", body: "Banked monthly — used as sick time." },
  { n: "04", title: "Monthly bonus", body: "Cash for hitting the goal." },
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
    title: "Your best people\nhave options.",
    body: "Bigger employers lure them with perks you can't match. A benefit people actually feel is hard to come by.",
    cta: "So what's the fix?",
  },
  {
    variant: "text",
    mark: true,
    eyebrow: "The idea",
    title: "Set the targets.",
    body: "Give your team simple movement goals. Hit them, and they earn wellness hours and a cash bonus — every month.",
    cta: "How does it work?",
  },
  {
    variant: "rules",
    eyebrow: "You're in control",
    title: "You set the rules.",
    body: "Four simple dials. Change them anytime.",
    cta: "What's the best part?",
  },
  {
    variant: "culture",
    eyebrow: "The best part",
    title: "Build the culture.",
    body: "Your team sees each other show up — and roots each other on.",
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
          <div className="font-display text-base font-bold tracking-[0.04em] text-accent">wlns</div>
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <RunnerMark tile={80} icon={40} radius={25} halo bob />
            <div>
              <h1 className="whitespace-pre-line font-display text-[2.2rem] font-bold leading-[1.06] tracking-tight text-ink">
                {"A wellness perk\nyour team uses."}
              </h1>
              <p className="mx-auto mt-3 max-w-[17rem] text-[0.92rem] leading-snug text-body-2">
                Health incentives for small- to medium-sized businesses.
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

/* A small peek of the in-app team feed — the "culture" proof. */
function FeedPeek() {
  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface p-3 shadow-card">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 font-display text-xs font-bold text-ink">
          <span className="grid h-5 w-5 place-items-center rounded-[6px] bg-gradient-to-br from-accent to-accent-dark text-white">
            <RunnerIcon size={12} strokeWidth={2.2} />
          </span>
          Today
        </span>
        <span className="text-[0.62rem] text-muted">Your team</span>
      </div>
      <div className="flex flex-col gap-2">
        <MiniPost initials="SM" color="#b4552f" name="Sarah" caption="5k before work" dur="34m" photo="from-amber-300 to-sky-400" />
        <MiniPost initials="DC" color="#2f6fb4" name="Devin" caption="Lunch walk w/ the team" dur="40m" photo="from-emerald-300 to-emerald-600" />
      </div>
    </div>
  );
}

function MiniPost({
  initials,
  color,
  name,
  caption,
  dur,
  photo,
}: {
  initials: string;
  color: string;
  name: string;
  caption: string;
  dur: string;
  photo: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-chip px-2.5 py-2">
      <span className="grid h-7 w-7 flex-none place-items-center rounded-full font-display text-[0.62rem] font-bold text-white" style={{ background: color }}>
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[0.78rem] font-semibold text-ink">
          {name} <span className="font-normal text-muted">· {dur}</span>
        </div>
        <div className="truncate text-[0.72rem] text-muted">{caption}</div>
      </div>
      <span className={`h-9 w-9 flex-none rounded-lg bg-gradient-to-br ${photo}`} />
    </div>
  );
}
