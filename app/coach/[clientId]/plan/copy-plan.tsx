"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Attach a plan you've already built for another client onto this person —
// copies the macro targets and the weekly workouts, then activates it. Handy
// for onboarding someone new without building from scratch.
export default function CopyPlanCard({
  targetClientId,
  sources,
}: {
  targetClientId: string;
  sources: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (sources.length === 0) return null;

  async function copy() {
    if (!pick) return;
    setBusy(true);
    setErr(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/copy-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ sourceClientId: pick, targetClientId }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      router.refresh();
    } catch (e) {
      setErr((e as Error)?.message ?? "Couldn't copy the plan.");
    } finally {
      setBusy(false);
    }
  }

  const pickedName = sources.find((s) => s.id === pick)?.name;

  return (
    <div className="copy-plan">
      <p className="copy-plan-title">Start from an existing plan</p>
      <p className="copy-plan-hint">
        Attach a plan you&apos;ve already built for someone else — the workouts
        and targets copy over, and you can tweak them after.
      </p>
      <div className="coach-add">
        <select
          className="coach-select"
          value={pick}
          onChange={(e) => setPick(e.target.value)}
        >
          <option value="">Copy a plan from…</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}&apos;s plan
            </option>
          ))}
        </select>
        <button
          type="button"
          className="coach-add-btn"
          onClick={copy}
          disabled={!pick || busy}
        >
          {busy ? "Copying…" : "Copy"}
        </button>
      </div>
      {pickedName && !busy && !err && (
        <p className="copy-plan-note">
          Copies {pickedName}&apos;s current plan and makes it active here.
        </p>
      )}
      {err && <p className="auth-error">{err}</p>}
    </div>
  );
}
