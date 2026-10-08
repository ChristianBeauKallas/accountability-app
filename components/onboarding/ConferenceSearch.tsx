"use client";

import { useEffect, useRef, useState } from "react";
import { Trophy, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Conference typeahead backed by the crowdsourced `conferences` table,
 * filtered to the level (division) the coach selected. Free text is always
 * allowed — a conference not in the system yet is saved on finish so the next
 * coach at that level can pick it.
 */
export function ConferenceSearch({
  division,
  value,
  onChange,
}: {
  division: string;
  value: string;
  onChange: (name: string) => void;
}) {
  const supabase = useRef(createClient()).current;
  const [results, setResults] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
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

  async function search(needle: string, showAll: boolean) {
    if (!division) {
      setResults([]);
      setOpen(false);
      return;
    }
    const term = needle.trim();
    if (!showAll && term.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    const mine = ++reqId.current;
    let query = supabase
      .from("conferences")
      .select("name")
      .eq("division", division)
      .order("name")
      .limit(term ? 8 : 60);
    if (term) {
      const esc = term.replace(/[%_\\]/g, (m) => `\\${m}`);
      query = query.or(`name.ilike.${esc}%,name.ilike.%${esc}%`);
    }
    const { data } = await query;
    if (mine !== reqId.current) return;
    const names = ((data ?? []) as { name: string }[]).map((r) => r.name);
    if (term) {
      const low = term.toLowerCase();
      names.sort((a, b) => {
        const ap = a.toLowerCase().startsWith(low) ? 0 : 1;
        const bp = b.toLowerCase().startsWith(low) ? 0 : 1;
        return ap - bp || a.localeCompare(b);
      });
    }
    setResults(names.slice(0, term ? 8 : 60));
    setOpen(names.length > 0);
  }

  function onType(v: string) {
    onChange(v);
    void search(v, false);
  }

  function pick(name: string) {
    onChange(name);
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
          onFocus={() => {
            setFocused(true);
            void search(value, true);
          }}
          onBlur={() => setFocused(false)}
          autoComplete="off"
          autoCapitalize="words"
          placeholder={division ? "e.g. KJCCC" : "Pick a level first"}
          disabled={!division}
          className="h-12 w-full rounded-input border border-border bg-surface pl-10 pr-4 text-[15px] text-ink placeholder:text-muted-2 focus:border-accent focus:outline-none disabled:opacity-60"
        />
      </div>

      {open && results.length > 0 && (focused || value.trim()) && (
        <ul className="absolute z-20 mt-1.5 max-h-72 w-full overflow-y-auto rounded-card border border-border bg-surface py-1 shadow-card">
          {results.map((name) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => pick(name)}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left hover:bg-chip"
              >
                <Trophy
                  size={15}
                  strokeWidth={2}
                  aria-hidden
                  className="shrink-0 text-muted-2"
                />
                <span className="text-[15px] text-ink">{name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
