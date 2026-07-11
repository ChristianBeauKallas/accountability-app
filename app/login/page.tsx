"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signup");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: displayName.trim() } },
      });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      // If email confirmation is off (recommended), a session is returned and
      // we're signed in immediately. If it's on, there's no session yet.
      if (!data.session) {
        setNeedsConfirm(true);
        setBusy(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
    }

    // If they arrived via an invite link, join that group now.
    try {
      const pending = localStorage.getItem("pendingInvite");
      if (pending) {
        await supabase.rpc("join_group", { code: pending });
        localStorage.removeItem("pendingInvite");
      }
    } catch {
      /* ignore — they can still join from onboarding */
    }

    router.push("/");
    router.refresh();
  }

  if (needsConfirm) {
    return (
      <main className="auth">
        <h1>Get Better</h1>
        <div className="notice">
          <strong>Almost there.</strong> Check <code>{email}</code> for a
          confirmation link, then come back and sign in.
        </div>
      </main>
    );
  }

  return (
    <main className="auth">
      <h1>Get Better</h1>
      <p className="subtitle">Show up. Every day.</p>

      <div className="tabs">
        <button
          type="button"
          className={mode === "signup" ? "active" : ""}
          onClick={() => setMode("signup")}
        >
          Create account
        </button>
        <button
          type="button"
          className={mode === "signin" ? "active" : ""}
          onClick={() => setMode("signin")}
        >
          Sign in
        </button>
      </div>

      <form onSubmit={submit} className="auth-form">
        {mode === "signup" && (
          <>
            <label htmlFor="displayName">Name</label>
            <input
              id="displayName"
              required
              autoComplete="name"
              placeholder="What the group calls you"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </>
        )}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" disabled={busy}>
          {busy
            ? "Just a sec…"
            : mode === "signup"
              ? "Create account"
              : "Sign in"}
        </button>
        {error && <p className="auth-error">{error}</p>}
      </form>
    </main>
  );
}
