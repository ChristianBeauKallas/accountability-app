"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const DAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; // ISO 1..7

// Collapsible week overview + day-swapper. Tap a day, then another, to swap
// them — swap tempo & long run, move a rest day, etc.
export default function WeekBoard({
  week,
  today,
}: {
  week: { weekday: number; title: string | null }[];
  today: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // Today's ISO weekday from the YYYY-MM-DD (noon local, tz-safe enough here).
  const todayWd = today
    ? (() => {
        const wd = new Date(today + "T12:00:00").getDay();
        return wd === 0 ? 7 : wd;
      })()
    : 0;

  async function swap(dayA: number, dayB: number) {
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/swap-days", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ dayA, dayB }),
      });
      if (!res.ok) throw new Error();
      setPick(null);
      router.refresh();
    } catch {
      // leave selection so they can retry
    } finally {
      setBusy(false);
    }
  }

  function tapDay(wd: number) {
    if (busy) return;
    if (pick === null) {
      setPick(wd);
    } else if (pick === wd) {
      setPick(null);
    } else {
      swap(pick, wd);
    }
  }

  return (
    <section className="wk">
      <button
        type="button"
        className="wk-toggle"
        onClick={() => {
          setOpen((o) => !o);
          setPick(null);
        }}
        aria-expanded={open}
      >
        <span>📅 This week</span>
        <span className={`wc-chevron ${open ? "open" : ""}`}>▾</span>
      </button>

      {open && (
        <>
          <p className="wk-hint">
            {pick
              ? "Now tap another day to swap them."
              : "Tap a day, then another, to swap them."}
          </p>
          <div className="wk-grid">
            {week.map((d) => {
              const i = d.weekday - 1;
              const isRest = !d.title;
              return (
                <button
                  key={d.weekday}
                  type="button"
                  className={`wk-day ${d.weekday === todayWd ? "today" : ""} ${
                    pick === d.weekday ? "picked" : ""
                  } ${isRest ? "rest" : ""}`}
                  onClick={() => tapDay(d.weekday)}
                  disabled={busy}
                >
                  <span className="wk-abbr">{DAY_ABBR[i]}</span>
                  <span className="wk-title">{d.title ?? "Rest"}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
