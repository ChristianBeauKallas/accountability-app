"use client";

import { createClient } from "@/lib/supabase/client";

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}

/** Send an audio blob to Whisper; returns the transcript ("" on failure). */
export async function transcribe(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, "audio.webm");
  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers: await authHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error("Couldn't transcribe that — try again.");
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
