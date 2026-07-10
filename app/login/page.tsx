"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="auth">
      <h1>Accountability</h1>
      <p className="subtitle">Show up. Every day.</p>

      {status === "sent" ? (
        <div className="notice">
          <strong>Check your email.</strong> We sent a magic link to{" "}
          <code>{email}</code>. Tap it on this device to sign in — no password
          needed.
        </div>
      ) : (
        <form onSubmit={sendLink} className="auth-form">
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
          <button type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Sending…" : "Send magic link"}
          </button>
          {error && <p className="auth-error">{error}</p>}
        </form>
      )}
    </main>
  );
}
