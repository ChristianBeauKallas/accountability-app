"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import type { UserRole } from "@/lib/types";

function LoginInner() {
  const params = useSearchParams();
  const roleParam = params.get("role");
  const role: UserRole | null =
    roleParam === "player" || roleParam === "coach" ? roleParam : null;

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  const supabase = createClient();

  function rememberRole() {
    if (role) {
      document.cookie = `athletx_role=${role}; path=/; max-age=1800; samesite=lax`;
    }
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("sending");
    setMessage("");
    rememberRole();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
        data: role ? { role } : undefined,
      },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
    }
  }

  async function signInWithGoogle() {
    rememberRole();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    }
  }

  const heading = role === "coach" ? "Coach sign in" : "Player sign in";

  if (status === "sent") {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-pill bg-accent-soft text-accent">
          <CheckCircle2 size={28} strokeWidth={2} aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-display font-bold">Check your email</h1>
        <p className="mt-2 max-w-xs text-body-2">
          We sent a sign-in link to <strong>{email}</strong>. Open it on this
          device to continue.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-6 text-sm font-semibold text-accent"
        >
          Use a different email
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex flex-col px-6 pt-14 pb-10">
      <Link
        href="/welcome"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted"
      >
        <ArrowLeft size={16} strokeWidth={2} aria-hidden />
        Back
      </Link>

      <div className="mt-10">
        <p className="eyebrow">{role ? "Welcome" : "Athletx"}</p>
        <h1 className="mt-2 text-3xl font-display font-bold tracking-tight">
          {heading}
        </h1>
        <p className="mt-2 text-body-2">
          We&rsquo;ll email you a secure link — no password to remember.
        </p>
      </div>

      <form onSubmit={sendMagicLink} className="mt-8 space-y-4">
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>

        {status === "error" && (
          <p className="text-sm text-warm-text">{message}</p>
        )}

        <Button type="submit" size="lg" full disabled={status === "sending"}>
          <Mail size={18} strokeWidth={2} aria-hidden />
          {status === "sending" ? "Sending…" : "Email me a link"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-2">
        <span className="h-px flex-1 bg-divider" />
        or
        <span className="h-px flex-1 bg-divider" />
      </div>

      <Button variant="secondary" size="lg" full onClick={signInWithGoogle}>
        <GoogleMark />
        Continue with Google
      </Button>

      <p className="mt-auto pt-10 text-center text-xs text-muted-2">
        By continuing you agree to the Athletx Terms &amp; Privacy Policy.
      </p>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
