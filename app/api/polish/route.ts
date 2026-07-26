import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth-api";

export const runtime = "nodejs";

// Cleans up a spoken/rough note into a natural first-person caption via Claude.
export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  const user = await verifyBearer(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    text?: string;
    context?: string;
  } | null;
  const text = body?.text?.trim();
  const context = body?.context?.trim();
  if (!text) return NextResponse.json({ error: "no text" }, { status: 400 });

  // If not configured, just echo the original — never block posting.
  if (!key) return NextResponse.json({ text });

  // With context (a coaching-log field like "Meal — What did you eat?"), tighten
  // the output to a short answer to that question rather than a caption.
  const prompt = context
    ? `This is a spoken entry in a fitness coaching log for: "${context}". ` +
      "Turn it into a short, clean answer — just the relevant details, no full sentences or filler. " +
      "For a meal or drink, list the items concisely (e.g. \"3 eggs, avocado toast, black coffee\"). " +
      "For exercise, name what was done. Do not add anything that isn't there. " +
      "Return ONLY the cleaned text, no quotes or preamble:\n\n" +
      text
    : "Rewrite this spoken daily check-in as a clean, natural first-person caption. " +
      "Keep the person's voice and meaning, fix grammar and remove filler words, keep it brief. " +
      "Do not add facts that aren't there. Return ONLY the caption, no quotes or preamble:\n\n" +
      text;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resp.ok) return NextResponse.json({ text }); // fall back to original

  const data = (await resp.json()) as {
    content?: { type: string; text?: string }[];
  };
  const out = data.content?.find((c) => c.type === "text")?.text?.trim();
  return NextResponse.json({ text: out || text });
}
