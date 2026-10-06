"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { STATES } from "@/lib/constants";

type City = [string, string, number, number]; // [name, state, lat, lng]

export type CityValue = {
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
};

// Loaded once, then shared across mounts.
let CITY_CACHE: City[] | null = null;
let CITY_PROMISE: Promise<City[]> | null = null;

function loadCities(): Promise<City[]> {
  if (CITY_CACHE) return Promise.resolve(CITY_CACHE);
  if (!CITY_PROMISE) {
    CITY_PROMISE = fetch("/us-cities.json")
      .then((r) => r.json())
      .then((d: City[]) => {
        CITY_CACHE = d;
        return d;
      })
      .catch(() => {
        CITY_PROMISE = null;
        return [];
      });
  }
  return CITY_PROMISE;
}

export function CitySearch({
  value,
  onChange,
}: {
  value: CityValue;
  onChange: (v: CityValue) => void;
}) {
  const [q, setQ] = useState(
    value.city ? (value.state ? `${value.city}, ${value.state}` : value.city) : ""
  );
  const [results, setResults] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(!!value.state);
  const boxRef = useRef<HTMLDivElement>(null);

  // Warm the dataset as soon as the step mounts.
  useEffect(() => {
    loadCities();
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function onType(v: string) {
    setQ(v);
    setPicked(false);
    onChange({ city: v.trim(), state: "", lat: null, lng: null });

    const needle = v.trim().toLowerCase();
    if (needle.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const data = await loadCities();
    const starts: City[] = [];
    const contains: City[] = [];
    for (const c of data) {
      const name = c[0].toLowerCase();
      if (name.startsWith(needle)) {
        if (starts.length < 8) starts.push(c);
      } else if (starts.length < 8 && name.includes(needle)) {
        contains.push(c);
      }
    }
    const res = [...starts, ...contains].slice(0, 8);
    setResults(res);
    setOpen(true);
  }

  function pick(c: City) {
    setQ(`${c[0]}, ${c[1]}`);
    setPicked(true);
    setOpen(false);
    onChange({ city: c[0], state: c[1], lat: c[2], lng: c[3] });
  }

  const showManual = q.trim().length >= 2 && !picked;

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
          value={q}
          onChange={(e) => onType(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          autoComplete="off"
          autoCapitalize="words"
          placeholder="Start typing your city…"
          className="h-12 w-full rounded-input border border-border bg-surface pl-10 pr-4 text-[15px] text-ink placeholder:text-muted-2 focus:border-accent focus:outline-none"
        />
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1.5 max-h-72 w-full overflow-y-auto rounded-card border border-border bg-surface py-1 shadow-card">
          {results.map((c) => (
            <li key={`${c[0]}-${c[1]}`}>
              <button
                type="button"
                onClick={() => pick(c)}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left hover:bg-chip"
              >
                <MapPin
                  size={15}
                  strokeWidth={2}
                  aria-hidden
                  className="shrink-0 text-muted-2"
                />
                <span className="text-[15px] text-ink">
                  {c[0]}
                  <span className="text-muted-2">, {c[1]}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {picked && (
        <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-accent">
          <MapPin size={14} strokeWidth={2} aria-hidden />
          {value.city}, {value.state}
        </p>
      )}

      {showManual && !open && (
        <div className="mt-3 rounded-input border border-dashed border-border bg-surface/50 p-3">
          <p className="text-xs text-muted-2">
            Don&rsquo;t see your town? Keep the name and pick your state:
          </p>
          <select
            value={value.state}
            onChange={(e) =>
              onChange({
                city: q.trim(),
                state: e.target.value,
                lat: null,
                lng: null,
              })
            }
            className="mt-2 h-11 w-full rounded-input border border-border bg-surface px-3 text-[15px] text-ink focus:border-accent focus:outline-none"
          >
            <option value="">Select state</option>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
