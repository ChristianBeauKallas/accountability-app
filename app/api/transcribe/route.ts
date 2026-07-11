import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth-api";

export const runtime = "nodejs";
export const maxDuration = 30;

// Transcribes an audio blob via OpenAI Whisper.
export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Transcription not configured." },
      { status: 503 },
    );
  }

  const user = await verifyBearer(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "no audio" }, { status: 400 });
  }

  const oaiForm = new FormData();
  oaiForm.append("file", audio, "audio.webm");
  oaiForm.append("model", "whisper-1");
  oaiForm.append("response_format", "json");

  const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: oaiForm,
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    return NextResponse.json(
      { error: "Transcription failed", detail },
      { status: 502 },
    );
  }

  const data = (await resp.json()) as { text?: string };
  return NextResponse.json({ text: (data.text ?? "").trim() });
}
