"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";

// Recruiting value-adds a program can showcase, grouped so a coach thinks
// across facilities, development, academics and results. The picker always
// shows these; crowdsourced/custom tags land in a "More" group.
export const FACILITY_GROUPS: { label: string; items: string[] }[] = [
  {
    label: "Facilities & tech",
    items: [
      "On-campus stadium",
      "Indoor training facility",
      "Indoor batting cages",
      "Turf field",
      "Weight room",
      "Lights for night games",
      "TrackMan / Rapsodo",
      "Film & video room",
      "Athletic training center",
      "On-campus housing",
    ],
  },
  {
    label: "Development",
    items: [
      "Player development focus",
      "Strength & conditioning",
      "Analytics-driven development",
      "Summer ball placement",
    ],
  },
  {
    label: "Academics",
    items: [
      "Strong academics",
      "Academic support",
      "Scholarship opportunities",
      "Wide range of majors",
    ],
  },
  {
    label: "Results & culture",
    items: [
      "Winning tradition",
      "Conference titles",
      "Sends players to 4-year programs",
      "Produces pro / draft players",
      "Tight-knit culture",
      "Playing-time opportunity",
      "Warm-weather location",
    ],
  },
];

const DEFAULT_KEYS = new Set(
  FACILITY_GROUPS.flatMap((g) => g.items).map((s) => s.toLowerCase())
);

function keyOf(s: string) {
  return s.trim().toLowerCase();
}

/**
 * Click-to-toggle recruiting value-adds a program offers. Defaults are grouped
 * built-in; crowdsourced tags from the `facilities` table and anything a coach
 * adds appear under "More". New tags are saved for others on finish.
 */
export function FacilityPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const supabase = useRef(createClient()).current;
  const [dbExtras, setDbExtras] = useState<string[]>([]);
  const [custom, setCustom] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("facilities")
        .select("name")
        .order("name");
      if (!active || !data) return;
      // Only keep DB tags that aren't already a built-in default.
      const extras = (data as { name: string }[])
        .map((r) => r.name)
        .filter((n) => !DEFAULT_KEYS.has(keyOf(n)));
      setDbExtras(extras);
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

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

  // "More" group: crowdsourced tags + anything the coach selected that isn't
  // a built-in default, de-duped.
  const moreSeen = new Set<string>();
  const more: string[] = [];
  for (const n of [...dbExtras, ...value]) {
    const k = keyOf(n);
    if (!DEFAULT_KEYS.has(k) && !moreSeen.has(k)) {
      moreSeen.add(k);
      more.push(n);
    }
  }

  function Chip({ name }: { name: string }) {
    const active = value.some((v) => keyOf(v) === keyOf(name));
    return (
      <button
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
  }

  return (
    <div className="space-y-4">
      {FACILITY_GROUPS.map((g) => (
        <div key={g.label}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-eyebrow text-muted-2">
            {g.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {g.items.map((name) => (
              <Chip key={name} name={name} />
            ))}
          </div>
        </div>
      ))}

      {more.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-eyebrow text-muted-2">
            More
          </p>
          <div className="flex flex-wrap gap-2">
            {more.map((name) => (
              <Chip key={name} name={name} />
            ))}
          </div>
        </div>
      )}

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
          aria-label="Add value-add"
        >
          <Plus size={18} strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </div>
  );
}
