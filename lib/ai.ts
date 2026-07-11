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

/** Clean up rough text into a caption via Claude; returns input on failure. */
export async function polish(text: string): Promise<string> {
  try {
    const res = await fetch("/api/polish", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return text;
    const data = await res.json();
    return (data.text ?? text) as string;
  } catch {
    return text;
  }
}
