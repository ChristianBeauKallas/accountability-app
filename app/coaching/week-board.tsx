"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function label(date: string) {
  const d = new Date(date + "T12:00:00");
  return { abbr: DAY_ABBR[d.getDay()], num: d.getDate() };
}

// Two-week calendar + day-swapper. Tap a day, then another, to swap their
// sessions — swap tempo & long run, move a rest day, etc. Each date is arranged
// independently (per-date), so next week can differ from this week.
export default function WeekBoard({
  fortnight,
  today,
}: {
  fortnight: { date: string; title: string | null }[];
  today: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function swap(dayA: string, dayB: string) {
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
      // keep the selection so they can retry
    } finally {
      setBusy(false);
    }
  }

  function tapDay(date: string) {
    if (busy) return;
    if (pick === null) setPick(date);
    else if (pick === date) setPick(null);
    else swap(pick, date);
  }

  const weeks = [fortnight.slice(0, 7), fortnight.slice(7, 14)];

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
        <span>📅 Next two weeks</span>
        <span className={`wc-chevron ${open ? "open" : ""}`}>▾</span>
      </button>

      {open && (
        <>
          <p className="wk-hint">
            {pick ? "Now tap another day to swap them." : "Tap a day, then another, to swap them."}
          </p>
          {weeks.map((wkDays, wi) => (
            <div className="wk-grid" key={wi}>
              {wkDays.map((d) => {
                const { abbr, num } = label(d.date);
                const isRest = !d.title;
                return (
                  <button
                    key={d.date}
                    type="button"
                    className={`wk-day ${d.date === today ? "today" : ""} ${
                      pick === d.date ? "picked" : ""
                    } ${isRest ? "rest" : ""}`}
                    onClick={() => tapDay(d.date)}
                    disabled={busy}
                  >
                    <span className="wk-abbr">
                      {abbr} {num}
                    </span>
                    <span className="wk-title">{d.title ?? "Rest"}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </>
      )}
    </section>
  );
}
