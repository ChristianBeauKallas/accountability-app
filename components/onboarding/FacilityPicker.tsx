"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";

// Shown even before the facilities table is populated, so the picker always
// has options; DB rows (including crowdsourced ones) are merged in.
const FACILITY_DEFAULTS = [
  "Indoor training",
  "Indoor batting cage",
  "Weight room",
  "Training center",
  "Outdoor housing",
  "Athletic training center",
  "Academic facilities",
];

function keyOf(s: string) {
  return s.trim().toLowerCase();
}

/**
 * Click-to-toggle facility tags a coach's program offers. Options come from
 * the crowdsourced `facilities` table (merged with a built-in starter set);
 * a coach can also add their own, which are saved for others on finish.
 */
export function FacilityPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const supabase = useRef(createClient()).current;
  const [options, setOptions] = useState<string[]>(FACILITY_DEFAULTS);
  const [custom, setCustom] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("facilities")
        .select("name")
        .order("name");
      if (!active || !data) return;
      // Merge DB names with the defaults, de-duped (case-insensitive).
      const seen = new Set(FACILITY_DEFAULTS.map(keyOf));
      const merged = [...FACILITY_DEFAULTS];
      for (const r of data as { name: string }[]) {
        if (!seen.has(keyOf(r.name))) {
          seen.add(keyOf(r.name));
          merged.push(r.name);
        }
      }
      setOptions(merged);
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  // Make sure any already-selected customs render as pills too.
  const optKeys = new Set(options.map(keyOf));
  const allOptions = [
    ...options,
    ...value.filter((v) => !optKeys.has(keyOf(v))),
  ];

  function toggle(name: string) {
    const k = keyOf(name);
    onChange(
      value.some((v) => keyOf(v) === k)
        ? value.filter((v) => keyOf(v) !== k)
        : [...value, name]
    );
  }

  function addCustom() {
    const parts = custom
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const have = new Set(value.map(keyOf));
    const next = [...value];
    for (const p of parts) {
      if (!have.has(keyOf(p))) {
        have.add(keyOf(p));
        next.push(p);
      }
    }
    onChange(next);
    setCustom("");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {allOptions.map((name) => {
          const active = value.some((v) => keyOf(v) === keyOf(name));
          return (
            <button
              key={name}
              type="button"
              onClick={() => toggle(name)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-pill px-3.5 py-2 text-sm font-semibold transition-colors",
                active
                  ? "bg-accent text-surface"
                  : "bg-chip text-body-2 hover:bg-accent-soft"
              )}
            >
              {active && <Check size={14} strokeWidth={2.5} aria-hidden />}
              {name}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Add your own (comma-separated)…"
          autoCapitalize="words"
          className="h-11 flex-1 rounded-input border border-border bg-surface px-3.5 text-[15px] text-ink placeholder:text-muted-2 focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!custom.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-input bg-accent-soft text-accent disabled:opacity-50"
          aria-label="Add facility"
        >
          <Plus size={18} strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </div>
  );
}
