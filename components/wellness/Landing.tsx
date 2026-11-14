"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RunnerIcon, RunnerMark } from "./Runner";

/* ---------- icons ---------- */
function TargetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}
function SlidersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="21" y1="6" x2="10" y2="6" />
      <line x1="6" y1="6" x2="3" y2="6" />
      <line x1="21" y1="12" x2="14" y2="12" />
      <line x1="10" y1="12" x2="3" y2="12" />
      <line x1="21" y1="18" x2="16" y2="18" />
      <line x1="12" y1="18" x2="3" y2="18" />
      <line x1="8" y1="4" x2="8" y2="8" />
      <line x1="12" y1="10" x2="12" y2="14" />
      <line x1="14" y1="16" x2="14" y2="20" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

const POINTS = [
  {
    icon: <TargetIcon />,
    title: "Set the targets",
    body: "Hit them, and your people earn wellness hours and a cash bonus.",
  },
  {
    icon: <SlidersIcon />,
    title: "You set the rules",
    body: "Days a month, minutes a day, hours banked as sick time, and the bonus.",
  },
  {
    icon: <UsersIcon />,
    title: "Build the culture",
    body: "A team that moves together — and cheers each other on.",
  },
];

export function Landing() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0 hero · 1 problem · 2 what-it-is
  const SLIDES = 2;

  const advance = () => (step < SLIDES ? setStep(step + 1) : router.push("/setup"));
  const back = () => setStep((s) => s - 1);

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
                Set the goals, reward the wins. No big-company budget required.
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
              {Array.from({ length: SLIDES }).map((_, i) => (
                <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < step ? "bg-accent" : "bg-track"}`} />
              ))}
            </div>
          </div>

          <div key={step} className="flex-1 overflow-y-auto">
            <div className="animate-tour-screen flex min-h-full flex-col px-[26px] pb-7 pt-3">
              {step === 1 ? (
                /* problem */
                <>
                  <div className="flex flex-1 flex-col justify-center gap-5">
                    <Eyebrow>The problem</Eyebrow>
                    <h2 className="whitespace-pre-line font-display text-[2.2rem] font-bold leading-[1.05] tracking-tight text-ink">
                      {"Your best people\nhave options."}
                    </h2>
                    <p className="text-[1.05rem] leading-relaxed text-body-2">
                      Bigger employers lure them with perks you can&apos;t match. A benefit people
                      actually feel is hard to come by.
                    </p>
                  </div>
                  <Cta label="So what's the fix?" />
                </>
              ) : (
                /* what it is */
                <>
                  <Eyebrow>What it is</Eyebrow>
                  <h2 className="mt-1.5 font-display text-[1.7rem] font-bold leading-[1.12] tracking-tight text-ink">
                    Reward your team with a health &amp; wellness incentive.
                  </h2>
                  <div className="mt-5 flex flex-col gap-4">
                    {POINTS.map((p, i) => (
                      <div key={i} className="flex items-start gap-3.5">
                        <span className="mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-xl bg-accent-soft text-accent">
                          {p.icon}
                        </span>
                        <div>
                          <div className="font-display text-[1rem] font-bold leading-tight text-ink">{p.title}</div>
                          <div className="text-[0.86rem] leading-snug text-body-2">{p.body}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <FeedPeek />

                  <div className="flex-1 min-h-[12px]" />
                  <Cta label="Create my group" className="mt-5" />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-display text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-accent">
      {children}
    </div>
  );
}

/* A small peek of the in-app team feed — the "culture" proof. */
function FeedPeek() {
  return (
    <div className="mt-5 rounded-2xl border border-border bg-surface p-3 shadow-card">
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
