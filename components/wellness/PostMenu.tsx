"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function DotsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

export function PostMenu({
  id,
  description,
  place,
  durationMinutes,
  minsPerDay,
}: {
  id: string;
  description: string | null;
  place: string | null;
  durationMinutes: number;
  minsPerDay: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<null | "edit" | "delete">(null);
  const [desc, setDesc] = useState(description ?? "");
  const [spot, setSpot] = useState(place ?? "");
  const [dur, setDur] = useState(durationMinutes);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function reset() {
    setDesc(description ?? "");
    setSpot(place ?? "");
    setDur(durationMinutes);
    setErr(null);
  }

  async function save() {
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("wl_checkins")
      .update({
        description: desc.trim() || null,
        place: spot.trim() || null,
        duration_minutes: dur,
      })
      .eq("id", id);
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    setBusy(false);
    setMode(null);
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase.from("wl_checkins").delete().eq("id", id);
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    setBusy(false);
    setMode(null);
    router.refresh();
  }

  const qualifies = dur >= minsPerDay;

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Post options"
        className="-mr-1 grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-chip hover:text-ink"
      >
        <DotsIcon />
      </button>

      {open && (
        <>
          <button
            aria-hidden
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-2.5 top-11 z-50 w-40 overflow-hidden rounded-xl border border-border bg-surface shadow-card">
            <button
              onClick={() => {
                setOpen(false);
                reset();
                setMode("edit");
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-ink hover:bg-chip"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              Edit
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setErr(null);
                setMode("delete");
              }}
              className="flex w-full items-center gap-2.5 border-t border-border px-3.5 py-2.5 text-left text-sm font-semibold text-danger hover:bg-chip"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              </svg>
              Delete
            </button>
          </div>
        </>
      )}

      {/* edit modal */}
      {mode === "edit" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-6 pt-20 sm:items-center">
          <div className="w-full max-w-[400px] rounded-card bg-surface p-5 shadow-card">
            <h3 className="font-display text-lg font-bold text-ink">Edit check-in</h3>
            <p className="mt-0.5 text-[0.78rem] text-muted">Photos stay the same — update the details below.</p>

            <label className="mt-4 block pl-0.5 text-[0.76rem] font-semibold text-body-2">What did you do?</label>
            <textarea
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Morning run before work"
              className="mt-1.5 w-full rounded-btn border border-border bg-chip px-3 py-2.5 text-[0.9rem] text-ink outline-none placeholder:text-muted focus:border-accent"
            />

            <label className="mt-3 block pl-0.5 text-[0.76rem] font-semibold text-body-2">Location</label>
            <input
              value={spot}
              onChange={(e) => setSpot(e.target.value)}
              placeholder="Add a spot"
              className="mt-1.5 w-full rounded-btn border border-border bg-chip px-3 py-2.5 text-[0.9rem] text-ink outline-none placeholder:text-muted focus:border-accent"
            />

            <label className="mt-3 block pl-0.5 text-[0.76rem] font-semibold text-body-2">How long did you move?</label>
            <div className="mt-1.5 flex items-center gap-3.5">
              <button
                onClick={() => setDur((d) => Math.max(5, d - 5))}
                aria-label="less"
                className="h-10 w-10 flex-none rounded-btn border border-border bg-surface text-xl text-ink"
              >
                −
              </button>
              <div className="min-w-[88px] text-center">
                <span className="font-display text-[1.5rem] font-bold text-ink">{dur}</span>
                <span className="block text-[0.66rem] font-semibold text-muted">minutes</span>
              </div>
              <button
                onClick={() => setDur((d) => d + 5)}
                aria-label="more"
                className="h-10 w-10 flex-none rounded-btn border border-border bg-surface text-xl text-ink"
              >
                +
              </button>
              {qualifies && (
                <span className="ml-auto text-[0.72rem] font-semibold text-accent">Qualifies ✓</span>
              )}
            </div>

            {err && <p className="mt-3 text-sm text-danger">{err}</p>}

            <div className="mt-5 flex gap-2.5">
              <button
                onClick={() => setMode(null)}
                className="h-11 flex-1 rounded-btn border border-border bg-surface text-sm font-semibold text-ink"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={busy}
                className="h-11 flex-1 rounded-btn bg-accent font-display text-sm font-semibold text-surface disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* delete confirm */}
      {mode === "delete" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-[320px] rounded-card bg-surface p-5 text-center shadow-card">
            <h3 className="font-display text-lg font-bold text-ink">Delete this check-in?</h3>
            <p className="mt-1.5 text-sm text-body-2">
              This removes it from the feed for good. It can&apos;t be undone.
            </p>
            {err && <p className="mt-3 text-sm text-danger">{err}</p>}
            <div className="mt-5 flex gap-2.5">
              <button
                onClick={() => setMode(null)}
                className="h-11 flex-1 rounded-btn border border-border bg-surface text-sm font-semibold text-ink"
              >
                Cancel
              </button>
              <button
                onClick={remove}
                disabled={busy}
                className="h-11 flex-1 rounded-btn bg-danger font-display text-sm font-semibold text-surface disabled:opacity-50"
              >
                {busy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
