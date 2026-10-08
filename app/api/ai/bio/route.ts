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

  let body: {
    text?: string;
    mode?: "player" | "program";
    position?: string;
    gradYear?: string | number;
    programName?: string;
    division?: string;
    conference?: string;
  };
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

  const isProgram = body.mode === "program";

  const context = isProgram
    ? [
        body.programName ? `Program: ${body.programName}.` : null,
        body.division ? `Level: ${body.division}.` : null,
        body.conference ? `Conference: ${body.conference}.` : null,
      ]
        .filter(Boolean)
        .join(" ")
    : [
        body.position ? `Primary position: ${body.position}.` : null,
        body.gradYear ? `Class of ${body.gradYear}.` : null,
      ]
        .filter(Boolean)
        .join(" ");

  const system = isProgram
    ? "You polish a college baseball program's 'About' blurb for recruits on a college-recruiting app. " +
      "A coach wrote rough notes about their program; your job is to turn them into a confident, authentic " +
      "description a recruit would want to read — leading with what makes the program worth choosing (culture, " +
      "player development, facilities, results, academics, and where they send players). " +
      "Rules: keep it to 3-5 sentences, under ~500 characters. Use ONLY facts the coach gave you — never invent or " +
      "inflate records, facilities, pipelines, rankings, or results. Fix grammar, tighten the language, and frame the " +
      "real details persuasively. Keep it genuine — not arrogant, generic, or cliché. No hashtags, no emojis, no " +
      "quotation marks around the result. Return ONLY the rewritten blurb."
    : "You polish a high-school or transfer baseball player's recruiting bio for a college-recruiting app. " +
      "This is a recruit marketing themselves to college coaches and recruiters — your job is to present them in " +
      "the best, most compelling light, leading with their strengths and what makes them worth recruiting. " +
      "Rewrite the player's notes into a confident, authentic first-person bio a college coach would want to read. " +
      "Rules: keep it to 3-5 sentences, under ~500 characters. Use ONLY facts the player gave you — never invent or " +
      "inflate stats, schools, awards, positions, or measurements. Fix grammar, tighten the language, and frame their " +
      "real details persuasively. Keep it confident and genuine — not arrogant, generic, or cliché. No hashtags, no " +
      "emojis, no quotation marks around the result. Return ONLY the rewritten bio text.";

  const task = isProgram
    ? `Coach's notes:\n${text}\n\nRewrite as the program's About blurb.`
    : `Player's notes:\n${text}\n\nRewrite as a recruiting bio.`;

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
          content: (context ? context + "\n\n" : "") + task,
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
