"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Lock, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import type { UserRole } from "@/lib/types";

type Mode = "signup" | "signin";

function LoginInner() {
  const params = useSearchParams();
  const roleParam = params.get("role");
  const paramRole: UserRole | null =
    roleParam === "player" || roleParam === "coach" ? roleParam : null;

  // Entering with a role (from the "I'm a…" cards) means a new account.
  const [mode, setMode] = useState<Mode>(paramRole ? "signup" : "signin");
  const [role, setRole] = useState<UserRole>(paramRole ?? "player");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "confirm" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  const supabase = createClient();

  function rememberRole() {
    document.cookie = `athletx_role=${role}; path=/; max-age=1800; samesite=lax`;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setStatus("sending");
    setMessage("");

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }
      window.location.href = "/";
      return;
    }

    // Sign up
    rememberRole();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role, full_name: name.trim() || undefined },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    // If the project has email confirmation off, we get a session right away.
    if (data.session) {
      window.location.href = "/";
      return;
    }
    // Otherwise try an immediate sign-in (works once confirmation is disabled).
    const { error: siErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!siErr) {
      window.location.href = "/";
      return;
    }
    setStatus("confirm");
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

  if (status === "confirm") {
    return (
      <main
        data-theme="dark"
        className="min-h-dvh bg-ground text-ink flex flex-col items-center justify-center px-6 text-center"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-pill bg-accent-soft text-accent">
          <CheckCircle2 size={28} strokeWidth={2} aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-display font-bold">
          Confirm your email
        </h1>
        <p className="mt-2 max-w-xs text-body-2">
          We sent a confirmation link to <strong>{email}</strong>. Open it, then
          come back and sign in.
        </p>
        <button
          onClick={() => {
            setMode("signin");
            setStatus("idle");
          }}
          className="mt-6 text-sm font-semibold text-accent"
        >
          Back to sign in
        </button>
      </main>
    );
  }

  const isSignup = mode === "signup";

  return (
    <main
      data-theme="dark"
      className="min-h-dvh bg-ground text-ink flex flex-col px-6 pt-14 pb-10"
    >
      <Link
        href="/welcome"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted"
      >
        <ArrowLeft size={16} strokeWidth={2} aria-hidden />
        Back
      </Link>

      <div className="mt-10">
        <p className="eyebrow">{isSignup ? "Welcome" : "Welcome back"}</p>
        <h1 className="mt-2 text-3xl font-display font-bold tracking-tight">
          {isSignup ? "Create your free account" : "Sign in"}
        </h1>
        <p className="mt-2 text-body-2">
          {isSignup
            ? "Set up your account with an email and password."
            : "Enter your email and password to continue."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {isSignup && !paramRole && (
          <Field label="I'm a…">
            <div className="grid grid-cols-2 gap-2">
              {(["player", "coach"] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    "h-11 rounded-btn text-sm font-semibold capitalize transition-colors",
                    role === r
                      ? "bg-accent text-surface"
                      : "bg-chip text-body-2 hover:bg-accent-soft"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </Field>
        )}

        {isSignup && (
          <Field label="Full name" htmlFor="name">
            <Input
              id="name"
              autoComplete="name"
              placeholder="First Last"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        )}

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

        <Field
          label="Password"
          htmlFor="password"
          hint={isSignup ? "At least 6 characters." : undefined}
        >
          <Input
            id="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </Field>

        {status === "error" && <p className="text-sm text-danger">{message}</p>}

        <Button type="submit" size="lg" full disabled={status === "sending"}>
          <Lock size={18} strokeWidth={2} aria-hidden />
          {status === "sending"
            ? isSignup
              ? "Creating…"
              : "Signing in…"
            : isSignup
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-body-2">
        {isSignup ? "Already have an account? " : "New to Athletx? "}
        <button
          type="button"
          onClick={() => {
            setMode(isSignup ? "signin" : "signup");
            setStatus("idle");
            setMessage("");
          }}
          className="font-semibold text-accent"
        >
          {isSignup ? "Sign in" : "Create a free account"}
        </button>
      </p>

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
