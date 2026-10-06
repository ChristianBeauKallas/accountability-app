import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-opus-5-5";

/**
 * Polishes a player's raw "About you" text into a tight, coach-facing
 * recruiting blurb. Requires a signed-in user and ANTHROPIC_API_KEY.
 */
export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });
  }

  // Only let signed-in users spend the key.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { text?: string; position?: string; gradYear?: string | number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "empty" }, { status: 400 });
  }
  if (text.length > 1200) {
    return NextResponse.json({ error: "too_long" }, { status: 400 });
  }

  const context = [
    body.position ? `Primary position: ${body.position}.` : null,
    body.gradYear ? `Class of ${body.gradYear}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const system =
    "You polish a high-school or transfer baseball player's recruiting bio for a college-recruiting app. " +
    "Rewrite the player's notes into a tight, confident, authentic first-person blurb a college coach would read. " +
    "Rules: keep it to 1-3 sentences, under 280 characters. Only use facts the player gave you — never invent " +
    "stats, schools, awards, or measurements. Fix grammar and tighten the language. Keep it humble-confident, not " +
    "boastful or cliché. No hashtags, no emojis, no quotation marks around the result. Return ONLY the rewritten bio text.";

  try {
    const client = new Anthropic();
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      output_config: { effort: "low" },
      system,
      messages: [
        {
          role: "user",
          content:
            (context ? context + "\n\n" : "") +
            `Player's notes:\n${text}\n\nRewrite as a recruiting bio.`,
        },
      ],
    });

    const out = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim()
      .replace(/^["']|["']$/g, "");

    if (!out) {
      return NextResponse.json({ error: "no_output" }, { status: 502 });
    }
    return NextResponse.json({ text: out });
  } catch {
    return NextResponse.json({ error: "ai_error" }, { status: 502 });
  }
}
