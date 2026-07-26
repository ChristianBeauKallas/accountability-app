"use client";

import { createClient } from "@/lib/supabase/client";

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}

/** Send an audio blob to Whisper; returns the transcript. */
export async function transcribe(blob: Blob): Promise<string> {
  // Name the file to match the actual recorded format (iPhone records mp4).
  const t = blob.type;
  const ext = t.includes("mp4") || t.includes("mpeg")
    ? "mp4"
    : t.includes("ogg")
      ? "ogg"
      : "webm";

  const form = new FormData();
  form.append("audio", blob, `audio.${ext}`);
  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers: await authHeaders(),
    body: form,
  });

  if (!res.ok) {
    let msg = "Couldn't transcribe that — try again.";
    try {
      const d = await res.json();
      if (res.status === 503) {
        msg = "Transcription isn't set up yet — add OPENAI_API_KEY in Vercel and redeploy.";
      } else if (d?.error) {
        msg = d.detail ? `${d.error}: ${String(d.detail).slice(0, 120)}` : d.error;
      }
    } catch {
      /* keep default */
    }
    throw new Error(msg);
  }

  const data = await res.json();
  return (data.text ?? "") as string;
}

export type MacroEstimate = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  items?: { name?: string; portion?: string }[];
  confidence?: "low" | "medium" | "high";
};

/** Estimate calories + macros from a meal photo (base64/data URL) and/or text. */
export async function estimateMacros(
  image: string | null,
  text: string,
): Promise<MacroEstimate> {
  const res = await fetch("/api/estimate-macros", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ image, text }),
  });
  if (!res.ok) {
    let msg = "Couldn't estimate macros — try again.";
    try {
      const d = await res.json();
      if (d?.error) msg = d.error;
    } catch {
      /* keep default */
    }
    throw new Error(msg);
  }
  return (await res.json()) as MacroEstimate;
}

/**
 * Clean up rough text via Claude; returns input on failure. An optional
 * `context` (e.g. "Meal — What did you eat?") tailors the output to a short,
 * relevant answer instead of a general caption.
 */
export async function polish(text: string, context?: string): Promise<string> {
  try {
    const res = await fetch("/api/polish", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ text, context }),
    });
    if (!res.ok) return text;
    const data = await res.json();
    return (data.text ?? text) as string;
  } catch {
    return text;
  }
}
