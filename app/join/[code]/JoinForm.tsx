"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RunnerMark } from "@/components/wellness/Runner";
import { BobLoader } from "@/components/wellness/BobLoader";
import { Input } from "@/components/ui/Field";

export function JoinForm({
  programId,
  programName,
}: {
  programId: string;
  programName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setPhoto(f);
    setPhotoURL(f ? URL.createObjectURL(f) : null);
  }

  async function join() {
    setErr(null);
    setBusy(true);
    const supabase = createClient();

    const { data: signUp, error: suErr } = await supabase.auth.signUp({
      email: email.trim(),
      password: pw,
    });
    if (suErr) {
      setBusy(false);
      setErr(suErr.message);
      return;
    }
    if (!signUp.session) {
      setBusy(false);
      setErr(
        "Account created — check your email to confirm, then log in. (Testing: turn off email confirmation in Supabase.)",
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

  return (
    <main className="relative flex min-h-dvh flex-col px-6 pb-8 pt-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <RunnerMark tile={60} icon={30} radius={18} />
        <div className="font-display text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-accent">
          {programName}
        </div>
        <h1 className="font-display text-2xl font-bold text-ink">You&apos;re invited to join.</h1>
        <p className="text-sm text-body-2">
          Create your account to start logging movement with the team.
        </p>
      </div>

      <div className="mt-6 flex justify-center">
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

      <div className="mt-5 flex flex-col gap-3">
        <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        <Input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <Input type="password" placeholder="Create a password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        {err && <p className="text-sm text-danger">{err}</p>}
        <button
          onClick={join}
          disabled={busy || !name.trim() || !email.trim() || pw.length < 6}
          className="flex h-[52px] items-center justify-center rounded-cta bg-accent font-display font-semibold text-surface transition-colors hover:bg-accent-dark disabled:opacity-50"
        >
          {busy ? "Joining…" : "Join the team"}
        </button>
      </div>

      {busy && <BobLoader message="Setting up your account…" />}
    </main>
  );
}
