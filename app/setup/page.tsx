"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { makeInviteCode } from "@/lib/wellness";
import { RunnerMark } from "@/components/wellness/Runner";
import { BobLoader } from "@/components/wellness/BobLoader";
import { Input } from "@/components/ui/Field";

type Step =
  | "intro"
  | "days"
  | "mins"
  | "hours"
  | "bonus"
  | "review"
  | "business"
  | "account";

const ORDER: Step[] = [
  "intro",
  "days",
  "mins",
  "hours",
  "bonus",
  "review",
  "business",
  "account",
];

const BOUNDS: Record<"days" | "mins" | "hours" | "bonus", [number, number, number]> = {
  days: [1, 31, 1],
  mins: [5, 120, 5],
  hours: [1, 40, 1],
  bonus: [0, 500, 5],
};

const AFFIRM = ["Boom.", "Nice.", "Love it.", "Perfect."];

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
  const bump = (k: keyof typeof draft, dir: 1 | -1) => {
    const [min, max, s] = BOUNDS[k];
    setDraft((d) => ({ ...d, [k]: Math.min(max, Math.max(min, d[k] + dir * s)) }));
  };

  // Show the bobbing loader for `ms`, then move to `next`.
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

    const { data: signUp, error: suErr } = await supabase.auth.signUp({
      email: email.trim(),
      password: pw,
    });
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
      const { error: upErr } = await supabase.storage
        .from("wellness")
        .upload(path, photo, { upsert: true, contentType: photo.type });
      if (!upErr) {
        avatar_url = supabase.storage.from("wellness").getPublicUrl(path).data.publicUrl;
      }
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

  const progress = Math.round((idx / (ORDER.length - 1)) * 100);

  return (
    <main
      className="relative flex min-h-dvh flex-col"
      style={{
        background:
          "linear-gradient(180deg, rgb(var(--c-accent-soft)), rgb(var(--c-ground)) 40%)",
      }}
    >
      {/* top bar */}
      <div className="flex shrink-0 items-center gap-3 px-5 pb-1 pt-4">
        {idx > 0 ? (
          <button
            onClick={back}
            aria-label="Back"
            className="grid h-[30px] w-[30px] place-items-center rounded-[9px] border border-border bg-surface text-ink"
          >
            ‹
          </button>
        ) : (
          <Link
            href="/"
            aria-label="Close"
            className="grid h-[30px] w-[30px] place-items-center rounded-[9px] border border-border bg-surface text-ink"
          >
            ×
          </Link>
        )}
        <div className="h-1 flex-1 overflow-hidden rounded-pill bg-track">
          <div
            className="h-full rounded-pill bg-accent transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <StepBody
          step={step}
          draft={draft}
          bump={bump}
          business={business}
          setBusiness={setBusiness}
          name={name}
          setName={setName}
          email={email}
          setEmail={setEmail}
          pw={pw}
          setPw={setPw}
          photoURL={photoURL}
          fileRef={fileRef}
          pickPhoto={pickPhoto}
          err={err}
          onStart={() => go("days", "Getting a few things ready…", 1000)}
          onNext={() => {
            const nextMap: Partial<Record<Step, [Step, string, number]>> = {
              days: ["mins", AFFIRM[1], 650],
              mins: ["hours", AFFIRM[2], 650],
              hours: ["bonus", AFFIRM[0], 650],
              bonus: ["review", "Building it…", 1700],
            };
            const n = nextMap[step];
            if (n) go(n[0], n[1], n[2]);
          }}
          onCreate={() => go("business", "Getting things set up…", 1200)}
          onBusiness={() =>
            go("account", `Setting up ${business.trim() || "your team"}…`, 1000)
          }
          onFinish={createProgram}
        />
      </div>

      {loader && <BobLoader message={loader} />}
    </main>
  );
}

function StepBody(props: any) {
  const {
    step,
    draft,
    bump,
    business,
    setBusiness,
    name,
    setName,
    email,
    setEmail,
    pw,
    setPw,
    photoURL,
    fileRef,
    pickPhoto,
    err,
    onStart,
    onNext,
    onCreate,
    onBusiness,
    onFinish,
  } = props;

  const Stepper = ({
    k,
    value,
    unit,
    prefix = "",
  }: {
    k: "days" | "mins" | "hours" | "bonus";
    value: number;
    unit: string;
    prefix?: string;
  }) => (
    <div className="my-1.5 flex items-center justify-center gap-[18px]">
      <button
        onClick={() => bump(k, -1)}
        aria-label="less"
        className="h-[58px] w-[58px] flex-none rounded-full border border-border bg-surface text-[1.7rem] text-ink shadow-card transition-colors hover:border-accent hover:text-accent active:scale-95"
      >
        −
      </button>
      <div className="min-w-[118px]">
        <span className="block font-display text-[3.4rem] font-bold leading-none tabular-nums text-ink">
          {prefix}
          {value}
        </span>
        <span className="mt-1.5 block text-[0.76rem] font-semibold text-muted">{unit}</span>
      </div>
      <button
        onClick={() => bump(k, 1)}
        aria-label="more"
        className="h-[58px] w-[58px] flex-none rounded-full border border-border bg-surface text-[1.7rem] text-ink shadow-card transition-colors hover:border-accent hover:text-accent active:scale-95"
      >
        +
      </button>
    </div>
  );

  const QWrap = ({
    count,
    title,
    children,
    cta,
    onClick,
  }: {
    count: string;
    title: string;
    children?: React.ReactNode;
    cta: string;
    onClick: () => void;
  }) => (
    <div className="animate-tour-screen flex min-h-[calc(100dvh-64px)] flex-col gap-4 px-[26px] pb-6 pt-2 text-center">
      <div className="font-display text-[0.72rem] font-semibold uppercase tracking-[0.09em] text-accent">
        {count}
      </div>
      <h2 className="font-display text-[1.5rem] font-bold leading-[1.2] tracking-tight text-ink">
        {title}
      </h2>
      {children}
      <div className="min-h-[14px] flex-1" />
      <button
        onClick={onClick}
        className="flex h-[52px] items-center justify-center rounded-cta bg-accent font-display font-semibold text-surface transition-colors hover:bg-accent-dark"
      >
        {cta}
      </button>
    </div>
  );

  if (step === "intro")
    return (
      <div className="animate-tour-screen flex min-h-[calc(100dvh-64px)] flex-col items-stretch gap-4 px-[26px] pb-6 pt-2 text-center">
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <RunnerMark tile={66} icon={34} radius={20} bob />
          <h2 className="font-display text-[1.5rem] font-bold leading-[1.2] tracking-tight text-ink">
            We&apos;re so happy you&apos;re here.
          </h2>
          <p className="text-[0.9rem] leading-relaxed text-body-2">
            Let&apos;s build your wellness incentive program together. Just four quick
            questions — and you can change anything later.
          </p>
        </div>
        <button
          onClick={onStart}
          className="flex h-[52px] items-center justify-center rounded-cta bg-accent font-display font-semibold text-surface transition-colors hover:bg-accent-dark"
        >
          Let&apos;s do it on this page
        </button>
      </div>
    );

  if (step === "days")
    return (
      <QWrap count="Question 1 of 4" title="How many days a month does a team member need to exercise to qualify?" cta="Continue" onClick={onNext}>
        <Stepper k="days" value={draft.days} unit="days / month" />
      </QWrap>
    );
  if (step === "mins")
    return (
      <QWrap count="Question 2 of 4" title="How many minutes per exercise to qualify?" cta="Continue" onClick={onNext}>
        <Stepper k="mins" value={draft.mins} unit="minutes / day" />
      </QWrap>
    );
  if (step === "hours")
    return (
      <QWrap count="Question 3 of 4" title="How many wellness hours do they bank each month they hit the goal?" cta="Continue" onClick={onNext}>
        <Stepper k="hours" value={draft.hours} unit="hours / month" />
      </QWrap>
    );
  if (step === "bonus")
    return (
      <QWrap count="Question 4 of 4" title="What's the monthly wellness incentive if they hit the goal?" cta="Continue" onClick={onNext}>
        <Stepper k="bonus" value={draft.bonus} unit="per qualifying month" prefix="$" />
      </QWrap>
    );

  if (step === "review")
    return (
      <QWrap count="Program" title="Here's what you built." cta="Create program" onClick={onCreate}>
        <div className="mt-0.5 rounded-card border border-border bg-surface px-4 text-left shadow-card">
          {[
            ["Days a month to qualify", `${draft.days} days`],
            ["Minutes per day", `${draft.mins} min / day`],
            ["Wellness hours banked", `${draft.hours} hrs / month`],
            ["Monthly incentive", `$${draft.bonus} / month`],
          ].map(([l, r], i, a) => (
            <div
              key={l}
              className={`flex items-center justify-between gap-3 py-[13px] ${i < a.length - 1 ? "border-b border-border" : ""}`}
            >
              <span className="text-[0.84rem] text-body-2">{l}</span>
              <span className="font-display text-base font-bold text-ink">{r}</span>
            </div>
          ))}
        </div>
        <p className="text-[0.9rem] leading-relaxed text-body-2">
          You can change any of this later in settings.
        </p>
      </QWrap>
    );

  if (step === "business")
    return (
      <div className="animate-tour-screen flex min-h-[calc(100dvh-64px)] flex-col gap-4 px-[26px] pb-6 pt-6 text-center">
        <div className="font-display text-[0.72rem] font-semibold uppercase tracking-[0.09em] text-accent">
          Almost there
        </div>
        <h2 className="font-display text-[1.5rem] font-bold leading-[1.2] tracking-tight text-ink">
          What&apos;s your office or business name?
        </h2>
        <p className="text-[0.9rem] leading-relaxed text-body-2">
          This is what your team sees at the top of the app.
        </p>
        <div className="mt-2 text-left">
          <Input
            placeholder="Noel Pierce Agency"
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
          />
        </div>
        <div className="min-h-[14px] flex-1" />
        <button
          onClick={onBusiness}
          disabled={!business.trim()}
          className="flex h-[52px] items-center justify-center rounded-cta bg-accent font-display font-semibold text-surface transition-colors hover:bg-accent-dark disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    );

  // account
  return (
    <div className="animate-tour-screen flex min-h-[calc(100dvh-64px)] flex-col gap-3.5 px-[26px] pb-6 pt-6 text-center">
      <div className="font-display text-[0.72rem] font-semibold uppercase tracking-[0.09em] text-accent">
        Last step
      </div>
      <h2 className="font-display text-[1.5rem] font-bold leading-[1.2] tracking-tight text-ink">
        Create your profile.
      </h2>
      <p className="text-[0.9rem] leading-relaxed text-body-2">
        You&apos;ll be the first member and an admin.
      </p>
      <div className="mt-1 flex justify-center">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative grid h-[108px] w-[108px] place-items-center overflow-hidden rounded-full border border-dashed border-border bg-chip text-muted"
        >
          {photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoURL} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[0.68rem]">Add photo</span>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={pickPhoto}
        />
      </div>
      <div className="flex flex-col gap-3 text-left">
        <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        <Input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <Input type="password" placeholder="Create a password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
      </div>
      {err && <p className="text-left text-sm text-danger">{err}</p>}
      <div className="min-h-[10px] flex-1" />
      <button
        onClick={onFinish}
        disabled={!name.trim() || !email.trim() || pw.length < 6}
        className="flex h-[52px] items-center justify-center rounded-cta bg-accent font-display font-semibold text-surface transition-colors hover:bg-accent-dark disabled:opacity-50"
      >
        Create my group
      </button>
    </div>
  );
}
