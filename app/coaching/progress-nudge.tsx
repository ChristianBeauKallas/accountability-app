"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// After a full week logged, nudge to build next week from the numbers — or, if
// a next-week draft already exists, to review and assign it.
export default function ProgressNudge({
  state,
  planId,
  href,
}: {
  state: "build" | "review";
  planId: string;
  href: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function build() {
    setBusy(true);
    setErr(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/progress-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? `HTTP ${res.status}`);
      }
      router.push(href); // review & assign the fresh draft
    } catch (e) {
      setErr((e as Error)?.message ?? "Couldn't build next week.");
      setBusy(false);
    }
  }

  if (state === "review") {
    return (
      <button type="button" className="prog-nudge" onClick={() => router.push(href)}>
        <span className="prog-ic">📈</span>
        <span className="prog-text">
          <span className="prog-title">Next week is ready</span>
          <span className="prog-sub">Review your progressed plan and assign it.</span>
        </span>
        <span className="prog-go">›</span>
      </button>
    );
  }

  return (
    <div className="prog-nudge build">
      <span className="prog-ic">📈</span>
      <span className="prog-text">
        <span className="prog-title">You logged a full week 💪</span>
        <span className="prog-sub">
          Build next week from your numbers — progressive overload on what you hit.
        </span>
        {err && <span className="prog-err">{err}</span>}
      </span>
      <button type="button" className="prog-btn" onClick={build} disabled={busy}>
        {busy ? "Building…" : "Build"}
      </button>
    </div>
  );
}
