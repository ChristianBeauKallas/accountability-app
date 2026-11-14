"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { makeInviteCode } from "@/lib/wellness";
import { RunnerMark } from "@/components/wellness/Runner";
import { BobLoader } from "@/components/wellness/BobLoader";
import { Input } from "@/components/ui/Field";

type Step = "intro" | "days" | "mins" | "hours" | "bonus" | "review" | "business" | "account";
const ORDER: Step[] = ["intro", "days", "mins", "hours", "bonus", "review", "business", "account"];

type Key = "days" | "mins" | "hours" | "bonus";
const BOUNDS: Record<Key, [number, number, number]> = {
  days: [1, 31, 1],
  mins: [5, 120, 5],
  hours: [1, 40, 1],
  bonus: [0, 500, 5],
};

const QMETA: Record<Key, { count: string; title: string; unit: string; prefix?: string; help: string }> = {
  days: {
    count: "Question 1 of 4",
    title: "How many days a month\nmust they exercise?",
    unit: "days / month",
    help: "The number of days someone works out to qualify that month.",
  },
  mins: {
    count: "Question 2 of 4",
    title: "How long should\neach workout be?",
    unit: "minutes / day",
    help: "The least movement that makes a day count. Shorter sessions add up across the day.",
  },
  hours: {
    count: "Question 3 of 4",
    title: "How many wellness\nhours do they earn?",
    unit: "hours / month",
    help: "Paid time they bank each qualifying month — usable as sick days.",
  },
  bonus: {
    count: "Question 4 of 4",
    title: "What's the\nmonthly cash bonus?",
    unit: "per qualifying month",
    prefix: "$",
    help: "Added to their paycheck each month they hit the goal. Set it to $0 to skip.",
  },
};

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [draft, setDraft] = useState({ days: 12, mins: 30, hours: 4, bonus: 50 });
  const [business, setBusiness] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [loader, setLoader] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const idx = ORDER.indexOf(step);
  const progress = Math.round((idx / (ORDER.length - 1)) * 100);
  const bump = (k: Key, dir: 1 | -1) => {
    const [min, max, s] = BOUNDS[k];
    setDraft((d) => ({ ...d, [k]: Math.min(max, Math.max(min, d[k] + dir * s)) }));
  };
  const go = (next: Step, message: string, ms = 650) => {
    setLoader(message);
    window.setTimeout(() => {
      setLoader(null);
      setStep(next);
    }, ms);
  };
  const back = () => idx > 0 && setStep(ORDER[idx - 1]);

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setPhoto(f);
    setPhotoURL(f ? URL.createObjectURL(f) : null);
  }

  async function createProgram() {
    setErr(null);
    setLoader("Creating your group…");
    const supabase = createClient();

    const { data: signUp, error: suErr } = await supabase.auth.signUp({ email: email.trim(), password: pw });
    if (suErr) {
      setLoader(null);
      setErr(suErr.message);
      return;
    }
    if (!signUp.session) {
      setLoader(null);
      setErr(
        "Account created — check your email to confirm, then log in. (To skip this for testing, turn off email confirmation in Supabase.)",
      );
      return;
    }
    const uid = signUp.user!.id;

    let avatar_url: string | null = null;
    if (photo) {
      const path = `${uid}/avatar-${Date.now()}`;
      const { error: upErr } = await supabase.storage.from("wellness").upload(path, photo, { upsert: true, contentType: photo.type });
      if (!upErr) avatar_url = supabase.storage.from("wellness").getPublicUrl(path).data.publicUrl;
    }

    const programId = crypto.randomUUID();
    const { error: pErr } = await supabase.from("wl_programs").insert({
      id: programId,
      name: business.trim() || "Your Team",
      days_goal: draft.days,
      mins_per_day: draft.mins,
      bank_hours_per_month: draft.hours,
      monthly_bonus_cents: draft.bonus * 100,
      invite_code: makeInviteCode(business || "team"),
      created_by: uid,
    });
    if (pErr) {
      setLoader(null);
      setErr(pErr.message);
      return;
    }

    const { error: mErr } = await supabase.from("wl_members").insert({
      id: uid,
      program_id: programId,
      name: name.trim() || "You",
      avatar_url,
      is_admin: true,
    });
    if (mErr) {
      setLoader(null);
      setErr(mErr.message);
      return;
    }

    router.push("/feed");
    router.refresh();
  }

  return (
    <main
      className="relative flex h-dvh flex-col"
      style={{ background: "linear-gradient(180deg, rgb(var(--c-accent-soft)), rgb(var(--c-ground)) 40%)" }}
    >
      <div className="flex shrink-0 items-center gap-3 px-5 pb-1 pt-4">
        {idx > 0 ? (
          <button onClick={back} aria-label="Back" className="grid h-[30px] w-[30px] place-items-center rounded-[9px] border border-border bg-surface text-ink">
            ‹
          </button>
        ) : (
          <Link href="/" aria-label="Close" className="grid h-[30px] w-[30px] place-items-center rounded-[9px] border border-border bg-surface text-ink">
            ×
          </Link>
        )}
        <div className="h-1 flex-1 overflow-hidden rounded-pill bg-track">
          <div className="h-full rounded-pill bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div key={step} className="flex-1 overflow-y-auto">
        <div className="animate-tour-screen flex min-h-full flex-col px-[26px] pb-7 pt-4">
          {/* ---------- intro ---------- */}
          {step === "intro" && (
            <>
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                <RunnerMark tile={66} icon={34} radius={20} bob />
                <h2 className="font-display text-[1.6rem] font-bold leading-tight tracking-tight text-ink">We&apos;re glad you&apos;re here.</h2>
                <p className="max-w-[18rem] text-[0.95rem] leading-relaxed text-body-2">
                  Let&apos;s build your team&apos;s wellness incentive in four quick steps. You can change anything later.
                </p>
              </div>
              <Cta label="Let's do it" onClick={() => go("days", "Setting things up…", 900)} />
            </>
          )}

          {/* ---------- questions ---------- */}
          {(["days", "mins", "hours", "bonus"] as Key[]).includes(step as Key) && (
            <Question
              k={step as Key}
              value={draft[step as Key]}
              draft={draft}
              bump={bump}
              onNext={() => {
                if (step === "bonus") go("review", "Putting your program together…", 1500);
                else go(ORDER[idx + 1], "Got it.", 600);
              }}
            />
          )}

          {/* ---------- review ---------- */}
          {step === "review" && (
            <>
              <Eyebrow>Your program</Eyebrow>
              <h2 className="mt-1.5 font-display text-[2rem] font-bold leading-[1.06] tracking-tight text-ink">Here&apos;s the deal.</h2>

              <div className="mt-5 rounded-card border border-border bg-gradient-to-br from-accent-soft to-surface p-4 shadow-card">
                <div className="mb-1.5 font-display text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-accent">What your team earns</div>
                <p className="font-display text-[1.2rem] font-semibold leading-snug text-ink">
                  <b>{draft.hours} wellness {draft.hours === 1 ? "hour" : "hours"}</b> + <b>${draft.bonus}</b> every month they exercise{" "}
                  <b>{draft.days} {draft.days === 1 ? "day" : "days"}</b> of <b>{draft.mins}+ minutes</b>.
                </p>
              </div>

              <div className="mt-4 rounded-card border border-border bg-surface px-4 shadow-card">
                {[
                  ["Days a month to qualify", `${draft.days} days`],
                  ["Minutes per day", `${draft.mins} min`],
                  ["Wellness hours banked", `${draft.hours} / month`],
                  ["Monthly cash bonus", `$${draft.bonus}`],
                ].map(([l, r], i, a) => (
                  <div key={l} className={`flex items-center justify-between gap-3 py-[13px] ${i < a.length - 1 ? "border-b border-border" : ""}`}>
                    <span className="text-[0.84rem] text-body-2">{l}</span>
                    <span className="font-display text-[0.98rem] font-bold text-ink">{r}</span>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-center text-[0.8rem] text-muted">You can fine-tune all of this later.</p>
              <div className="min-h-[18px] flex-1" />
              <Cta label="Create program" onClick={() => go("business", "Locking it in…", 1100)} />
            </>
          )}

          {/* ---------- business ---------- */}
          {step === "business" && (
            <>
              <Eyebrow>Almost there</Eyebrow>
              <h2 className="mt-1.5 font-display text-[2rem] font-bold leading-[1.06] tracking-tight text-ink">Name your group.</h2>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-body-2">Your business or office name — it&apos;s what your team sees at the top of the app.</p>
              <div className="mt-5">
                <Input placeholder="e.g. Noel Pierce Agency" value={business} onChange={(e) => setBusiness(e.target.value)} />
              </div>
              <div className="min-h-[18px] flex-1" />
              <Cta label="Continue" disabled={!business.trim()} onClick={() => go("account", `Setting up ${business.trim() || "your team"}…`, 1000)} />
            </>
          )}

          {/* ---------- account ---------- */}
          {step === "account" && (
            <>
              <Eyebrow>Last step</Eyebrow>
              <h2 className="mt-1.5 font-display text-[2rem] font-bold leading-[1.06] tracking-tight text-ink">Create your profile.</h2>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-body-2">You&apos;ll be the first member and an admin of {business.trim() || "your team"}.</p>
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="relative grid h-[104px] w-[104px] place-items-center overflow-hidden rounded-full border border-dashed border-border bg-chip text-muted"
                >
                  {photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoURL} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[0.68rem]">Add photo</span>
                  )}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
              </div>
              <div className="mt-4 flex flex-col gap-3">
                <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                <Input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                <Input type="password" placeholder="Create a password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
              </div>
              {err && <p className="mt-3 text-sm text-danger">{err}</p>}
              <div className="min-h-[16px] flex-1" />
              <Cta label="Create my group" disabled={!name.trim() || !email.trim() || pw.length < 6} onClick={createProgram} />
            </>
          )}
        </div>
      </div>

      {loader && <BobLoader message={loader} />}
    </main>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="font-display text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-accent">{children}</div>;
}

function Question({
  k,
  value,
  draft,
  bump,
  onNext,
}: {
  k: Key;
  value: number;
  draft: { days: number; mins: number; hours: number; bonus: number };
  bump: (k: Key, dir: 1 | -1) => void;
  onNext: () => void;
}) {
  const m = QMETA[k];
  return (
    <>
      <Eyebrow>{m.count}</Eyebrow>
      <h2 className="mt-1.5 whitespace-pre-line font-display text-[1.85rem] font-bold leading-[1.1] tracking-tight text-ink">{m.title}</h2>

      <div className="mt-7 flex items-center justify-center gap-[18px]">
        <button onClick={() => bump(k, -1)} aria-label="less" className="h-[58px] w-[58px] flex-none rounded-full border border-border bg-surface text-[1.7rem] text-ink shadow-card transition-colors hover:border-accent hover:text-accent active:scale-95">
          −
        </button>
        <div className="min-w-[120px] text-center">
          <span className="font-display text-[3.4rem] font-bold leading-none tabular-nums text-ink">
            {m.prefix}
            {value}
          </span>
          <span className="mt-1.5 block text-[0.76rem] font-semibold text-muted">{m.unit}</span>
        </div>
        <button onClick={() => bump(k, 1)} aria-label="more" className="h-[58px] w-[58px] flex-none rounded-full border border-border bg-surface text-[1.7rem] text-ink shadow-card transition-colors hover:border-accent hover:text-accent active:scale-95">
          +
        </button>
      </div>

      <p className="mx-auto mt-5 max-w-[19rem] text-center text-[0.86rem] leading-snug text-body-2">{m.help}</p>

      <div className="min-h-[18px] flex-1" />

      <DealPreview draft={draft} />
      <Cta label="Continue" onClick={onNext} />
    </>
  );
}

function DealPreview({ draft }: { draft: { days: number; mins: number; hours: number; bonus: number } }) {
  return (
    <div className="mb-3 rounded-card border border-border bg-chip p-3.5 text-left">
      <div className="mb-1 font-display text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-accent">The deal so far</div>
      <p className="text-[0.88rem] leading-snug text-body-2">
        Exercise <b className="text-ink">{draft.days} {draft.days === 1 ? "day" : "days"}</b> a month, <b className="text-ink">{draft.mins}+ min</b> each — earn{" "}
        <b className="text-ink">{draft.hours} {draft.hours === 1 ? "hr" : "hrs"}</b>
        {draft.bonus > 0 && (
          <>
            {" + "}
            <b className="text-ink">${draft.bonus}</b>
          </>
        )}
        .
      </p>
    </div>
  );
}

function Cta({ label, onClick, disabled, className = "" }: { label: string; onClick: () => void; disabled?: boolean; className?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex h-[52px] w-full items-center justify-center rounded-cta bg-accent font-display font-semibold text-surface transition-colors hover:bg-accent-dark disabled:opacity-50 ${className}`}
    >
      {label}
    </button>
  );
}
