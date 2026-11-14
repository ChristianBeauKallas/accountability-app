"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RunnerMark } from "./Runner";

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}
function GiftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12v10H4V12" />
      <path d="M2 7h20v5H2z" />
      <path d="M12 22V7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}
function PulseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

const STEPS = [
  { icon: <CameraIcon />, title: "They check in", body: "A quick photo and a tap when they move." },
  { icon: <GiftIcon />, title: "They earn", body: "Hit the monthly goal and bank wellness hours plus a cash bonus." },
  { icon: <PulseIcon />, title: "You track it", body: "See who's active and who qualified, all month." },
];

const RULES = [
  { n: "01", title: "Days per month", body: "Days they move to qualify." },
  { n: "02", title: "Minutes per day", body: "How long counts toward a day." },
  { n: "03", title: "Wellness hours", body: "Banked monthly — used as sick time." },
  { n: "04", title: "Monthly bonus", body: "Cash for hitting the goal." },
];

type Slide = {
  kind: "text" | "steps" | "rules";
  eyebrow: string;
  title: string;
  body?: string;
  mark?: boolean;
  note?: string;
  cta: string;
};

const SLIDES: Slide[] = [
  {
    kind: "text",
    eyebrow: "The problem",
    title: "Your best people\nhave options.",
    body: "Bigger employers lure them with perks you can't match. A benefit people actually feel is hard to come by.",
    cta: "So what's the fix?",
  },
  {
    kind: "steps",
    eyebrow: "What it is",
    title: "Reward your team\nfor moving.",
    note: "Healthier, more energized teams — minus the big-company budget.",
    cta: "What do I set?",
  },
  {
    kind: "rules",
    eyebrow: "The mechanics",
    title: "You set\nthe rules.",
    note: "Free to set up · about a minute.",
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

  const CTA = ({ onClick, label, className = "" }: { onClick: () => void; label: string; className?: string }) => (
    <button
      onClick={onClick}
      className={`flex h-[52px] items-center justify-center rounded-cta bg-accent font-display font-semibold text-surface transition-colors hover:bg-accent-dark ${className}`}
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
              <h1 className="font-display text-[2.35rem] font-bold leading-[1.04] tracking-tight text-ink">
                Move together.
                <br />
                <span className="text-accent">Earn together.</span>
              </h1>
              <p className="mx-auto mt-3 max-w-[16rem] text-[0.92rem] leading-snug text-body-2">
                A real benefit for your team, without the big-company budget.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <CTA onClick={() => setStep(1)} label="See how it works" className="w-full" />
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

          <div key={step} className="animate-tour-screen flex flex-1 flex-col px-[26px] pb-7 pt-3">
            {slide!.kind === "text" && (
              <>
                <div className="flex flex-1 flex-col justify-center gap-5">
                  {slide!.mark && <RunnerMark tile={56} icon={28} radius={18} />}
                  <div>
                    <Eyebrow>{slide!.eyebrow}</Eyebrow>
                    <h2 className="mt-2 whitespace-pre-line font-display text-[2.2rem] font-bold leading-[1.05] tracking-tight text-ink">
                      {slide!.title}
                    </h2>
                  </div>
                  <p className="text-[1.05rem] leading-relaxed text-body-2">{slide!.body}</p>
                </div>
                <CTA onClick={advance} label={slide!.cta} />
              </>
            )}

            {slide!.kind === "steps" && (
              <>
                <Eyebrow>{slide!.eyebrow}</Eyebrow>
                <h2 className="mt-1.5 whitespace-pre-line font-display text-[1.95rem] font-bold leading-[1.08] tracking-tight text-ink">
                  {slide!.title}
                </h2>
                <div className="mt-5 flex flex-col gap-3.5">
                  {STEPS.map((s, i) => (
                    <div key={i} className="flex items-start gap-3.5">
                      <span className="mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-xl bg-accent-soft text-accent">
                        {s.icon}
                      </span>
                      <div>
                        <div className="font-display text-[1rem] font-bold leading-tight text-ink">{s.title}</div>
                        <div className="text-[0.86rem] leading-snug text-body-2">{s.body}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex-1" />
                {slide!.note && <p className="mt-5 text-center text-[0.8rem] leading-snug text-muted">{slide!.note}</p>}
                <CTA onClick={advance} label={slide!.cta} className="mt-2.5" />
              </>
            )}

            {slide!.kind === "rules" && (
              <>
                <Eyebrow>{slide!.eyebrow}</Eyebrow>
                <h2 className="mt-1.5 whitespace-pre-line font-display text-[1.95rem] font-bold leading-[1.08] tracking-tight text-ink">
                  {slide!.title}
                </h2>
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
                <div className="flex-1" />
                {slide!.note && <p className="mt-5 text-center text-[0.8rem] text-muted">{slide!.note}</p>}
                <CTA onClick={advance} label={slide!.cta} className="mt-2.5" />
              </>
            )}
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
