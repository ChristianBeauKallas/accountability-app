import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-opus-5-5";

const POSITION_NAME: Record<string, string> = {
  C: "catcher",
  "1B": "first baseman",
  "2B": "second baseman",
  "3B": "third baseman",
  SS: "shortstop",
  LF: "left fielder",
  CF: "center fielder",
  RF: "right fielder",
  OF: "outfielder",
  RHP: "right-handed pitcher",
  LHP: "left-handed pitcher",
  DH: "designated hitter / bat",
  UTIL: "utility player",
};

/**
 * Turns a coach's structured roster need into a short recruiting post —
 * a punchy headline plus a 1-2 sentence description. Requires a signed-in
 * user and ANTHROPIC_API_KEY. Uses ONLY the facts the coach entered.
 */
export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    programId?: string;
    position?: string;
    gradMin?: string | number | null;
    gradMax?: string | number | null;
    acceptsTransfer?: boolean;
    minGpa?: string | number | null;
    pitches?: string[];
    mustHave?: string[];
    minExit?: string | number | null;
    minFb?: string | number | null;
    minSixty?: string | number | null;
    minPop?: string | number | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const position = (body.position ?? "").trim();
  if (!position) {
    return NextResponse.json({ error: "no_position" }, { status: 400 });
  }

  // Program context (name, level, conference) — read-only lookup.
  let programName = "";
  let division = "";
  let conference = "";
  if (body.programId) {
    const { data: prog } = await supabase
      .from("programs")
      .select("name, division, conference")
      .eq("id", body.programId)
      .maybeSingle();
    if (prog) {
      programName = prog.name ?? "";
      division = prog.division ?? "";
      conference = prog.conference ?? "";
    }
  }

  const posName = POSITION_NAME[position] ?? position;
  const n = (v: unknown) =>
    v === "" || v == null ? null : Number(v);

  const facts: string[] = [];
  if (programName)
    facts.push(
      `Program: ${programName}${division ? ` (${division}${conference ? `, ${conference}` : ""})` : ""}.`
    );
  facts.push(`Position needed: ${posName} (${position}).`);

  const gMin = n(body.gradMin);
  const gMax = n(body.gradMax);
  if (gMin && gMax)
    facts.push(
      gMin === gMax
        ? `Class of ${gMin}.`
        : `Grad years ${gMin}–${gMax}.`
    );
  else if (gMin) facts.push(`Grad year ${gMin} or later.`);
  else if (gMax) facts.push(`Grad year up to ${gMax}.`);
  if (body.acceptsTransfer) facts.push("Open to transfers.");

  const gpa = n(body.minGpa);
  if (gpa && gpa > 0) facts.push(`Minimum GPA ${gpa}.`);

  const pitches = (body.pitches ?? []).filter(Boolean);
  if (pitches.length) facts.push(`Pitches of interest: ${pitches.join(", ")}.`);

  const mustHave = (body.mustHave ?? []).filter(Boolean);
  if (mustHave.length) facts.push(`Must-haves: ${mustHave.join(", ")}.`);

  const fb = n(body.minFb);
  if (fb) facts.push(`Fastball ${fb}+ mph.`);
  const exit = n(body.minExit);
  if (exit) facts.push(`Exit velo ${exit}+ mph.`);
  const sixty = n(body.minSixty);
  if (sixty) facts.push(`60-yard dash ${sixty} seconds or faster.`);
  const pop = n(body.minPop);
  if (pop) facts.push(`Pop time ${pop} seconds or faster.`);

  const system =
    "You write short recruiting posts for a college baseball program's open " +
    "roster need, shown to players who fit it. Given structured criteria, write " +
    "two things: (1) title — a punchy headline of AT MOST 6 words, no ending " +
    "period, that names the spot and the key ask (e.g. 'RHP, mid-80s with a " +
    "breaker' or 'Shortstop with pop'); (2) description — 1 to 2 sentences, under " +
    "240 characters, in a confident, plain coach voice describing what they're " +
    "looking for and who should show interest. " +
    "Use ONLY the facts provided — never invent stats, grades, requirements, " +
    "facilities, or results. No hashtags, no emojis, no quotation marks inside " +
    "the text. Return ONLY valid JSON of the form " +
    '{"title": "...", "description": "..."} and nothing else.';

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
            "Roster need:\n" +
            facts.join("\n") +
            "\n\nWrite the recruiting post as JSON.",
        },
      ],
    });

    const raw = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();

    let parsed: { title?: string; description?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "bad_output" }, { status: 502 });
    }

    const title = (parsed.title ?? "").trim().replace(/^["']|["']$/g, "");
    const description = (parsed.description ?? "")
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!title) {
      return NextResponse.json({ error: "no_output" }, { status: 502 });
    }
    return NextResponse.json({ title, description });
  } catch {
    return NextResponse.json({ error: "ai_error" }, { status: 502 });
  }
}
