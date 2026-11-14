"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { RunnerMark } from "@/components/wellness/Runner";
import { Input } from "@/components/ui/Field";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pw,
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    router.push("/feed");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col px-6 pb-8 pt-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <RunnerMark tile={60} icon={30} radius={18} />
        <h1 className="font-display text-2xl font-bold text-ink">Welcome back</h1>
        <p className="text-sm text-body-2">Log in to your team&apos;s wellness program.</p>
      </div>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
        <Input
          type="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <Input
          type="password"
          required
          placeholder="Password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="current-password"
        />
        {err && <p className="text-sm text-danger">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="flex h-[52px] items-center justify-center rounded-cta bg-accent font-display font-semibold text-surface transition-colors hover:bg-accent-dark disabled:opacity-50"
        >
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/setup" className="font-semibold text-accent">
          Set up a program
        </Link>
      </p>
    </main>
  );
}
