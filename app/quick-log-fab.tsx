"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { syncPlanRecap } from "@/lib/plan-recap";

type Kind = "check" | "water" | "workout" | "open";
type Item = {
  id: string;
  label: string;
  emoji: string;
  kind: Kind;
  unit: string | null;
  done: boolean;
  todayAmount: number | null;
};

const WATER_STEP = 16; // one glass per tap

// The feed's quick-logger: a + button that opens a sheet of today's plan
// items. Check habits and water log instantly right here; meals, weigh-ins,
// and the workout open their full logger (deep-linked, no scrolling to find).
export default function QuickLogFab({
  relationshipId,
  userId,
  day,
  items,
}: {
  relationshipId: string;
  userId: string;
  day: string;
  items: Item[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  // Local optimistic state so a tap feels instant before the refresh lands.
  const [state, setState] = useState<Record<string, { done: boolean; amount: number }>>(
    () =>
      Object.fromEntries(
        items.map((it) => [it.id, { done: it.done, amount: it.todayAmount ?? 0 }]),
      ),
  );

  function whenISO() {
    // Anchor to the logged day at noon so it lands on the right calendar day.
    const todayLocal = new Date().toISOString().slice(0, 10);
    return day === todayLocal
      ? new Date().toISOString()
      : new Date(day + "T12:00:00").toISOString();
  }

  async function logCheck(it: Item) {
    if (busy) return;
    setBusy(it.id);
    const supabase = createClient();
    const cur = state[it.id]?.done;
    try {
      if (cur) {
        // Untoggle: remove today's entries for this tracker.
        const start = new Date(day + "T00:00:00").toISOString();
        const end = new Date(new Date(day + "T00:00:00").getTime() + 86400000).toISOString();
        await supabase
          .from("coaching_entries")
          .delete()
          .eq("relationship_id", relationshipId)
          .eq("tracker_id", it.id)
          .gte("happened_at", start)
          .lt("happened_at", end);
        setState((s) => ({ ...s, [it.id]: { done: false, amount: 0 } }));
      } else {
        await supabase.from("coaching_entries").insert({
          relationship_id: relationshipId,
          client_id: userId,
          tracker_id: it.id,
          happened_at: whenISO(),
        });
        setState((s) => ({ ...s, [it.id]: { done: true, amount: 0 } }));
      }
      await syncPlanRecap(day);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function addWater(it: Item) {
    if (busy) return;
    setBusy(it.id);
    const supabase = createClient();
    try {
      await supabase.from("coaching_entries").insert({
        relationship_id: relationshipId,
        client_id: userId,
        tracker_id: it.id,
        happened_at: whenISO(),
        amount: WATER_STEP,
      });
      setState((s) => ({
        ...s,
        [it.id]: { done: true, amount: (s[it.id]?.amount ?? 0) + WATER_STEP },
      }));
      await syncPlanRecap(day);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  function openFullLogger(it: Item) {
    setOpen(false);
    if (it.kind === "workout") router.push("/coaching/workout");
    else router.push(`/coaching?log=${it.id}`);
  }

  const remaining = items.filter((it) => !state[it.id]?.done).length;

  return (
    <>
      <button
        type="button"
        className="qf-fab"
        aria-label="Quick log"
        onClick={() => setOpen(true)}
      >
        +
      </button>

      {open && (
        <div className="qf-overlay" onClick={() => setOpen(false)}>
          <div
            className="qf-sheet"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="qf-handle" />
            <div className="qf-head">
              <h2>Log for today</h2>
              <span className="qf-sub">
                {remaining === 0 ? "All done 🎉" : `${remaining} left`}
              </span>
            </div>

            <div className="qf-list">
              {items.map((it) => {
                const st = state[it.id] ?? { done: it.done, amount: it.todayAmount ?? 0 };
                const isBusy = busy === it.id;
                if (it.kind === "check") {
                  return (
                    <button
                      key={it.id}
                      type="button"
                      className={`qf-item ${st.done ? "done" : ""}`}
                      onClick={() => logCheck(it)}
                      disabled={isBusy}
                    >
                      <span className="qf-emoji">{it.emoji}</span>
                      <span className="qf-label">{it.label}</span>
                      <span className="qf-check">{st.done ? "✓" : ""}</span>
                    </button>
                  );
                }
                if (it.kind === "water") {
                  return (
                    <button
                      key={it.id}
                      type="button"
                      className={`qf-item ${st.done ? "done" : ""}`}
                      onClick={() => addWater(it)}
                      disabled={isBusy}
                    >
                      <span className="qf-emoji">💧</span>
                      <span className="qf-label">{it.label}</span>
                      <span className="qf-amt">
                        {st.amount > 0 ? `${st.amount} ${it.unit ?? "oz"}` : ""}
                        <span className="qf-plus">+{WATER_STEP}</span>
                      </span>
                    </button>
                  );
                }
                // meal / weigh-in / workout → open the full logger
                return (
                  <button
                    key={it.id}
                    type="button"
                    className={`qf-item ${st.done ? "done" : ""}`}
                    onClick={() => openFullLogger(it)}
                  >
                    <span className="qf-emoji">{it.emoji}</span>
                    <span className="qf-label">{it.label}</span>
                    <span className="qf-go">{st.done ? "✓" : "›"}</span>
                  </button>
                );
              })}
            </div>

            <button type="button" className="qf-close" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
