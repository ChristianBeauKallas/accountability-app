"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatHours, formatMoney } from "@/lib/wellness";
import { RunnerMark } from "@/components/wellness/Runner";
import { BobLoader } from "@/components/wellness/BobLoader";
import { Input } from "@/components/ui/Field";

type Step = "welcome" | "how" | "checkin" | "account";
const ORDER: Step[] = ["welcome", "how", "checkin", "account"];

export function JoinForm({
  programId,
  programName,
  daysGoal,
  minsPerDay,
  bankHours,
  bonusCents,
}: {
  programId: string;
  programName: string;
  daysGoal: number;
  minsPerDay: number;
  bankHours: number;
  bonusCents: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const idx = ORDER.indexOf(step);
  const go = (s: Step) => setStep(s);
  const next = () => idx < ORDER.length - 1 && setStep(ORDER[idx + 1]);
  const back = () => idx > 0 && setStep(ORDER[idx - 1]);

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setPhoto(f);
    setPhotoURL(f ? URL.createObjectURL(f) : null);
  }

  async function join() {
    setErr(null);
    setBusy(true);
    const supabase = createClient();

    const { data: signUp, error: suErr } = await supabase.auth.signUp({ email: email.trim(), password: pw });
    if (suErr) {
      setBusy(false);
      setErr(suErr.message);
      return;
    }
    if (!signUp.session) {
      setBusy(false);
      setErr("Account created — check your email to confirm, then log in. (Testing: turn off email confirmation in Supabase.)");
      return;
    }
    const uid = signUp.user!.id;

    let avatar_url: string | null = null;
    if (photo) {
      const path = `${uid}/avatar-${Date.now()}`;
      const { error: upErr } = await supabase.storage.from("wellness").upload(path, photo, { upsert: true, contentType: photo.type });
      if (!upErr) avatar_url = supabase.storage.from("wellness").getPublicUrl(path).data.publicUrl;
    }

    const { error: mErr } = await supabase.from("wl_members").insert({
      id: uid,
      program_id: programId,
      name: name.trim() || "New member",
      avatar_url,
      is_admin: false,
    });
    if (mErr) {
      setBusy(false);
      setErr(mErr.message);
      return;
    }

    router.push("/feed");
    router.refresh();
  }

  const Cta = ({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-[52px] w-full items-center justify-center rounded-cta bg-accent font-display font-semibold text-surface transition-colors hover:bg-accent-dark disabled:opacity-50"
    >
      {label}
    </button>
  );

  return (
    <main
      className="relative flex h-dvh flex-col"
      style={{ background: "linear-gradient(180deg, rgb(var(--c-accent-soft)), rgb(var(--c-ground)) 42%)" }}
    >
      {step !== "welcome" && (
        <div className="flex shrink-0 items-center gap-3 px-5 pb-1 pt-4">
          <button onClick={back} aria-label="Back" className="grid h-[30px] w-[30px] place-items-center rounded-[9px] border border-border bg-surface text-ink">
            ‹
          </button>
          <div className="flex gap-1.5">
            {ORDER.slice(1).map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < idx ? "bg-accent" : "bg-track"}`} />
            ))}
          </div>
        </div>
      )}

      <div key={step} className="flex-1 overflow-y-auto">
        <div className="animate-tour-screen flex min-h-full flex-col px-[26px] pb-7 pt-5">
          {step === "welcome" && (
            <>
              <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
                <RunnerMark tile={78} icon={40} radius={24} halo bob />
                <div>
                  <div className="font-display text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-accent">You&apos;re invited</div>
                  <h1 className="mt-2 font-display text-[2rem] font-bold leading-[1.08] tracking-tight text-ink">
                    {programName}&apos;s wellness program.
                  </h1>
                  <p className="mx-auto mt-3 max-w-[18rem] text-[0.95rem] leading-relaxed text-body-2">
                    A benefit that rewards you for staying active. Let&apos;s show you how it works.
                  </p>
                </div>
              </div>
              <Cta label="Opt in" onClick={next} />
            </>
          )}

          {step === "how" && (
            <>
              <div className="font-display text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-accent">How it works</div>
              <h2 className="mt-1.5 font-display text-[2rem] font-bold leading-[1.07] tracking-tight text-ink">
                Move, and get rewarded.
              </h2>
              <p className="mt-4 text-[1rem] leading-relaxed text-body-2">
                Exercise <b className="text-ink">{daysGoal} days a month</b>, at least{" "}
                <b className="text-ink">{minsPerDay} minutes</b> each day. Walks, the gym, home workouts, a bike ride — it all counts.
              </p>
              <div className="mt-5 rounded-card border border-border bg-gradient-to-br from-accent-soft to-surface p-4 shadow-card">
                <div className="mb-1.5 font-display text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-accent">What you earn</div>
                <p className="font-display text-[1.15rem] font-semibold leading-snug text-ink">
                  <b>{formatHours(bankHours)} wellness hours</b> + <b>{formatMoney(bonusCents)}</b> every month you hit the goal.
                </p>
                <p className="mt-1.5 text-[0.8rem] text-body-2">Wellness hours are paid time you can use as sick days.</p>
              </div>
              <div className="min-h-[18px] flex-1" />
              <Cta label="Next" onClick={next} />
            </>
          )}

          {step === "checkin" && (
            <>
              <div className="font-display text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-accent">It&apos;s easy</div>
              <h2 className="mt-1.5 font-display text-[2rem] font-bold leading-[1.07] tracking-tight text-ink">
                Just check in.
              </h2>
              <p className="mt-4 text-[1rem] leading-relaxed text-body-2">
                After each workout, snap a quick photo, tag where you were, and log the minutes. A few taps and you&apos;re done — and the whole team sees you showed up.
              </p>
              <div className="min-h-[18px] flex-1" />
              <Cta label="Create my account" onClick={next} />
            </>
          )}

          {step === "account" && (
            <>
              <div className="font-display text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-accent">Join {programName}</div>
              <h2 className="mt-1.5 font-display text-[2rem] font-bold leading-[1.07] tracking-tight text-ink">
                Create your profile.
              </h2>
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
              <div className="min-h-[14px] flex-1" />
              <Cta label={`Join ${programName}`} onClick={join} disabled={busy || !name.trim() || !email.trim() || pw.length < 6} />
            </>
          )}
        </div>
      </div>

      {busy && <BobLoader message="Setting up your account…" />}
    </main>
  );
}
