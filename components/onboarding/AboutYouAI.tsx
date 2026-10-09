"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Sparkles, Undo2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Textarea } from "@/components/ui/Field";

export function AboutYouAI({
  value,
  onChange,
  position,
  gradYear,
  mode = "player",
  programName,
  division,
  conference,
  generateFields,
  facilities,
}: {
  value: string;
  onChange: (v: string) => void;
  position?: string | null;
  gradYear?: string | null;
  mode?: "player" | "program";
  programName?: string | null;
  division?: string | null;
  conference?: string | null;
  // When provided (player mode), enables "Generate from my profile" — writes
  // a bio from the structured onboarding data even if nothing's typed.
  generateFields?: Record<string, unknown> | null;
  // Program-mode facility tags that feed "Generate with AI".
  facilities?: string[];
}) {
  const isProgram = mode === "program";
  // Player generates from structured fields; program generates from its
  // name/level/conference plus the selected facility tags.
  const canGenerate = isProgram ? true : !!generateFields;
  const [listening, setListening] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [note, setNote] = useState("");
  const [prev, setPrev] = useState<string | null>(null);
  const busy = polishing || generating;

  const recRef = useRef<any>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const speechSupported =
    typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  function toggleMic() {
    if (!speechSupported) return;
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (e: any) => {
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      }
      if (finalText.trim()) {
        const base = valueRef.current;
        onChange((base ? base.trim() + " " : "") + finalText.trim());
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setNote("");
    rec.start();
    setListening(true);
  }

  async function polish() {
    const text = value.trim();
    if (!text || polishing) return;
    setPolishing(true);
    setNote("");
    try {
      const res = await fetch("/api/ai/bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          mode,
          position,
          gradYear,
          programName,
          division,
          conference,
        }),
      });
      if (res.status === 503) {
        setNote("AI polish isn't set up yet.");
        return;
      }
      if (!res.ok) {
        setNote("Couldn't polish that — try again.");
        return;
      }
      const data = (await res.json()) as { text?: string };
      if (data.text) {
        setPrev(text);
        onChange(data.text);
        setNote("Polished ✨ — tweak anything you want.");
      }
    } catch {
      setNote("Couldn't polish that — try again.");
    } finally {
      setPolishing(false);
    }
  }

  async function generate() {
    if (busy || !canGenerate) return;
    setGenerating(true);
    setNote("");
    try {
      const payload = isProgram
        ? {
            mode: "program",
            generate: true,
            programName,
            division,
            conference,
            facilities,
            text: value.trim() || undefined,
          }
        : {
            mode: "player",
            generate: true,
            fields: generateFields,
            text: value.trim() || undefined,
          };
      const res = await fetch("/api/ai/bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 503) {
        setNote("AI isn't set up yet — write your own below.");
        return;
      }
      if (!res.ok) {
        setNote("Couldn't generate — try again, or write your own.");
        return;
      }
      const data = (await res.json()) as { text?: string };
      if (data.text) {
        setPrev(value);
        onChange(data.text);
        setNote("Drafted from your profile ✨ — edit anything you want.");
      }
    } catch {
      setNote("Couldn't generate — try again, or write your own.");
    } finally {
      setGenerating(false);
    }
  }

  function undo() {
    if (prev == null) return;
    onChange(prev);
    setPrev(null);
    setNote("");
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            isProgram
              ? "e.g. JUCO contender in the KJCCC. Turf infield, indoor cages and TrackMan. We develop hitters and send guys up — 11 to four-year programs the last three years. Hard-nosed culture, strong classroom support, and we compete for a conference title every season."
              : "e.g. I'm a left-handed hitting shortstop at Wichita East, class of 2026. Hit .380 with plus speed last spring and captained the team…"
          }
          maxLength={700}
          rows={6}
        />
        {speechSupported && (
          <button
            type="button"
            onClick={toggleMic}
            aria-label={listening ? "Stop recording" : "Dictate with your voice"}
            className={cn(
              "absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-pill transition-colors",
              listening
                ? "bg-danger text-surface animate-pulse"
                : "bg-accent-soft text-accent"
            )}
          >
            {listening ? (
              <Square size={16} strokeWidth={2.5} aria-hidden />
            ) : (
              <Mic size={18} strokeWidth={2} aria-hidden />
            )}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canGenerate ? (
          <>
            <button
              type="button"
              onClick={generate}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-btn bg-ink px-3.5 py-2 text-sm font-semibold text-ground disabled:opacity-50"
            >
              <Sparkles size={16} strokeWidth={2} aria-hidden />
              {generating
                ? "Writing…"
                : isProgram
                  ? "Generate with AI"
                  : "Generate from my profile"}
            </button>
            {value.trim() && (
              <button
                type="button"
                onClick={polish}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-btn border border-border px-3 py-2 text-sm font-semibold text-body-2 disabled:opacity-50"
              >
                <Sparkles size={15} strokeWidth={2} aria-hidden />
                {polishing ? "Polishing…" : "Polish"}
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={polish}
            disabled={!value.trim() || busy}
            className="inline-flex items-center gap-2 rounded-btn bg-ink px-3.5 py-2 text-sm font-semibold text-ground disabled:opacity-50"
          >
            <Sparkles size={16} strokeWidth={2} aria-hidden />
            {polishing ? "Polishing…" : isProgram ? "Polish" : "Polish for recruiting"}
          </button>
        )}
        {prev != null && (
          <button
            type="button"
            onClick={undo}
            className="inline-flex items-center gap-1.5 rounded-btn border border-border px-3 py-2 text-sm font-semibold text-body-2"
          >
            <Undo2 size={15} strokeWidth={2} aria-hidden />
            Undo
          </button>
        )}
      </div>

      <p className="text-xs text-muted-2">
        {note ||
          (canGenerate
            ? isProgram
              ? "Pick what applies above, then tap generate — we'll draft your description. Edit anything, or write your own."
              : "Tap generate and we'll draft it from your profile — then edit anything. Or write your own."
            : speechSupported
              ? `Type it, or tap the mic to say it — then we'll tighten it up for ${
                  isProgram ? "recruits" : "coaches"
                }.`
              : `Write it in your own words — then we'll tighten it up for ${
                  isProgram ? "recruits" : "coaches"
                }.`)}
      </p>
    </div>
  );
}
