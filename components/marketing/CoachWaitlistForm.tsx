"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

const LEVELS = ["JUCO", "NAIA", "D2", "D3", "Other"];
const ROLES = [
  { value: "head", label: "Head coach" },
  { value: "assistant", label: "Assistant" },
  { value: "recruiting_coordinator", label: "Recruiting coordinator" },
  { value: "other", label: "Other" },
];

export function CoachWaitlistForm() {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [school, setSchool] = useState("");
  const [level, setLevel] = useState("");
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim()) {
      setError("Add your name and email so we can reach you.");
      return;
    }
    setSaving(true);
    const { error: err } = await supabase.from("coach_waitlist").insert({
      name: name.trim(),
      email: email.trim(),
      school: school.trim() || null,
      level: level || null,
      role: role || null,
      notes: notes.trim() || null,
    });
    setSaving(false);

    // 23505 = unique violation on email → already signed up, treat as success.
    if (err && err.code !== "23505") {
      setError("Something went wrong — try again, or DM us @ athletx.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-card border border-accent/30 bg-accent-soft p-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-pill bg-accent text-surface">
          <Check size={28} strokeWidth={2.5} aria-hidden />
        </span>
        <h3 className="font-display text-2xl font-bold text-ink">You&rsquo;re on the list</h3>
        <p className="mx-auto mt-2 max-w-sm text-[15px] text-body-2">
          We&rsquo;re onboarding coaches in small groups. We&rsquo;ll reach out at{" "}
          <span className="font-semibold text-ink">{email}</span> with your
          early access. Talk soon.
        </p>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-input border border-border bg-surface px-4 py-3 text-[15px] text-ink placeholder:text-muted-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="w-name" className="mb-1.5 block text-sm font-semibold text-ink">
            Name
          </label>
          <input
            id="w-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Coach name"
            className={inputCls}
            autoComplete="name"
          />
        </div>
        <div>
          <label htmlFor="w-email" className="mb-1.5 block text-sm font-semibold text-ink">
            Email
          </label>
          <input
            id="w-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@school.edu"
            className={inputCls}
            autoComplete="email"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="w-school" className="mb-1.5 block text-sm font-semibold text-ink">
            School / program
          </label>
          <input
            id="w-school"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            placeholder="e.g. Sterling College"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="w-level" className="mb-1.5 block text-sm font-semibold text-ink">
            Level
          </label>
          <select
            id="w-level"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className={inputCls}
          >
            <option value="">Select…</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-ink">Your role</label>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              className={cn(
                "h-10 rounded-pill px-4 text-sm font-semibold transition-colors",
                role === r.value
                  ? "bg-accent text-surface"
                  : "bg-chip text-body-2 hover:bg-accent-soft"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="w-notes" className="mb-1.5 block text-sm font-semibold text-ink">
          Anything you want us to know? <span className="text-muted-2">(optional)</span>
        </label>
        <textarea
          id="w-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="What you're recruiting for, what's broken about recruiting for you now…"
          className={cn(inputCls, "resize-none")}
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="h-[54px] w-full rounded-cta bg-accent text-base font-semibold text-surface transition-colors hover:bg-accent-dark disabled:opacity-60"
      >
        {saving ? "Sending…" : "Join the waitlist"}
      </button>
      <p className="text-center text-xs text-muted-2">
        Free for the test group. No spam — we&rsquo;ll only email about your access.
      </p>
    </form>
  );
}
