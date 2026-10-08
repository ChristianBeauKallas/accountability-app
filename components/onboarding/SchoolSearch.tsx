"use client";

import { useEffect, useRef, useState } from "react";
import { GraduationCap, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type SchoolRow = {
  name: string;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
};

/**
 * Institution typeahead backed by the crowdsourced `schools` table. As the
 * coach types we query Supabase (prefix-first). Picking a result both sets the
 * name and hands the full record back via `onPick` so the caller can prefill
 * the program's location. Free text is always allowed — a school that isn't in
 * the system yet gets saved when the coach finishes onboarding.
 */
export function SchoolSearch({
  value,
  onChange,
  onPick,
}: {
  value: string;
  onChange: (name: string) => void;
  onPick: (school: SchoolRow) => void;
}) {
  const supabase = useRef(createClient()).current;
  const [results, setResults] = useState<SchoolRow[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function search(needle: string) {
    const term = needle.trim();
    if (term.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const mine = ++reqId.current;
    // Escape LIKE wildcards in the user's input.
    const esc = term.replace(/[%_\\]/g, (m) => `\\${m}`);
    const { data } = await supabase
      .from("schools")
      .select("name, city, state, lat, lng")
      .or(`name.ilike.${esc}%,name.ilike.%${esc}%`)
      .order("name")
      .limit(8);
    if (mine !== reqId.current) return; // a newer keystroke won
    const rows = (data ?? []) as SchoolRow[];
    // Prefix matches first.
    const low = term.toLowerCase();
    rows.sort((a, b) => {
      const ap = a.name.toLowerCase().startsWith(low) ? 0 : 1;
      const bp = b.name.toLowerCase().startsWith(low) ? 0 : 1;
      return ap - bp || a.name.localeCompare(b.name);
    });
    setResults(rows);
    setOpen(rows.length > 0);
  }

  function onType(v: string) {
    onChange(v);
    void search(v);
  }

  function pick(s: SchoolRow) {
    onChange(s.name);
    onPick(s);
    setOpen(false);
    setResults([]);
  }

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <Search
          size={18}
          strokeWidth={2}
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-2"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onType(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          autoComplete="off"
          autoCapitalize="words"
          placeholder="e.g. Cowley College"
          className="h-12 w-full rounded-input border border-border bg-surface pl-10 pr-4 text-[15px] text-ink placeholder:text-muted-2 focus:border-accent focus:outline-none"
        />
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1.5 max-h-72 w-full overflow-y-auto rounded-card border border-border bg-surface py-1 shadow-card">
          {results.map((s) => (
            <li key={`${s.name}-${s.state ?? ""}`}>
              <button
                type="button"
                onClick={() => pick(s)}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left hover:bg-chip"
              >
                <GraduationCap
                  size={16}
                  strokeWidth={2}
                  aria-hidden
                  className="shrink-0 text-muted-2"
                />
                <span className="text-[15px] text-ink">
                  {s.name}
                  {s.state && <span className="text-muted-2">, {s.state}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
