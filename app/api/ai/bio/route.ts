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
  DH: "designated hitter",
  UTIL: "utility player",
};

type PlayerFields = {
  name?: string;
  gradYear?: string | number;
  isTransfer?: boolean;
  currentSchool?: string;
  primary?: string;
  positions?: string[];
  city?: string;
  state?: string;
  heightIn?: number;
  weightLb?: number;
  bats?: string;
  throws?: string;
  gpa?: string | number;
  sixty?: string | number;
  exitVelo?: string | number;
  infVelo?: string | number;
  ofVelo?: string | number;
  battingAvg?: string | number;
  popTime?: string | number;
  fastball?: string | number;
  spinRate?: string | number;
  era?: string | number;
  pitches?: string[];
};

// Turn a player's structured onboarding data into a plain fact list for the
// model. Only non-empty values are included.
function playerFactsFrom(f: PlayerFields): string {
  const num = (v: unknown) => (v === "" || v == null ? null : Number(v));
  const hand = (h?: string) =>
    h === "R" ? "right" : h === "L" ? "left" : h === "S" ? "switch" : null;

  const lines: string[] = [];
  const posName = f.primary ? POSITION_NAME[f.primary] ?? f.primary : null;
  const others = (f.positions ?? []).filter((p) => p && p !== f.primary);

  if (posName)
    lines.push(
      `Primary position: ${posName}${
        others.length ? ` (also plays ${others.join(", ")})` : ""
      }.`
    );
  if (f.gradYear) lines.push(`Class of ${f.gradYear}.`);
  if (f.isTransfer)
    lines.push(
      `Transfer${f.currentSchool ? ` from ${f.currentSchool}` : ""} (currently in college).`
    );
  if (f.city || f.state)
    lines.push(`From ${[f.city, f.state].filter(Boolean).join(", ")}.`);

  const h = num(f.heightIn);
  if (h) lines.push(`Height: ${Math.floor(h / 12)}'${h % 12}".`);
  const w = num(f.weightLb);
  if (w) lines.push(`Weight: ${w} lb.`);

  const bats = hand(f.bats);
  const throws = hand(f.throws);
  if (bats && throws) lines.push(`Bats ${bats}, throws ${throws}.`);
  else if (throws) lines.push(`Throws ${throws}.`);

  const gpa = num(f.gpa);
  if (gpa) lines.push(`GPA: ${gpa}.`);

  const exit = num(f.exitVelo);
  if (exit) lines.push(`Exit velocity: ${exit} mph.`);
  const avg = num(f.battingAvg);
  if (avg) lines.push(`Batting average: ${avg.toFixed(3).replace(/^0/, "")}.`);
  const sixty = num(f.sixty);
  if (sixty) lines.push(`60-yard dash: ${sixty} sec.`);
  const inf = num(f.infVelo);
  if (inf) lines.push(`Infield velocity: ${inf} mph.`);
  const of = num(f.ofVelo);
  if (of) lines.push(`Outfield velocity: ${of} mph.`);
  const pop = num(f.popTime);
  if (pop) lines.push(`Pop time: ${pop} sec.`);

  const fb = num(f.fastball);
  if (fb) lines.push(`Fastball velocity: ${fb} mph.`);
  const spin = num(f.spinRate);
  if (spin) lines.push(`Spin rate: ${spin} rpm.`);
  const era = num(f.era);
  if (era) lines.push(`ERA: ${era}.`);
  const pitches = (f.pitches ?? []).filter(Boolean);
  if (pitches.length) lines.push(`Pitch arsenal: ${pitches.join(", ")}.`);

  return lines.join("\n");
}

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
    generate?: boolean;
    fields?: PlayerFields;
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

  const isProgram = body.mode === "program";
  // Player generate mode: write a bio from the structured profile, even with
  // no notes typed. Polish mode (the default) rewrites what they wrote.
  const isGenerate = body.generate === true && !isProgram;

  const text = (body.text ?? "").trim();
  if (text.length > 1200) {
    return NextResponse.json({ error: "too_long" }, { status: 400 });
  }
  const playerFacts = isGenerate ? playerFactsFrom(body.fields ?? {}) : "";
  if (!isGenerate && !text) {
    return NextResponse.json({ error: "empty" }, { status: 400 });
  }
  if (isGenerate && !playerFacts) {
    return NextResponse.json({ error: "no_fields" }, { status: 400 });
  }

  const context = isProgram
    ? [
        body.programName ? `Program: ${body.programName}.` : null,
        body.division ? `Level: ${body.division}.` : null,
        body.conference ? `Conference: ${body.conference}.` : null,
      ]
        .filter(Boolean)
        .join(" ")
    : isGenerate
      ? playerFacts
      : [
          body.position ? `Primary position: ${body.position}.` : null,
          body.gradYear ? `Class of ${body.gradYear}.` : null,
        ]
          .filter(Boolean)
          .join(" ");

  const playerGenerateSystem =
    "You write a high-school or transfer baseball player's recruiting bio from " +
    "scratch for a college-recruiting app, using the structured profile details " +
    "provided. This is a recruit marketing themselves to college coaches — present " +
    "them in the best, most compelling light, leading with their strongest numbers " +
    "and what makes them worth recruiting. Write a confident, authentic first-person " +
    "bio. Rules: 3-5 sentences, under ~500 characters. Use ONLY the facts provided — " +
    "never invent or inflate stats, schools, awards, positions, or measurements, and " +
    "don't restate every number mechanically; weave the highlights into real " +
    "sentences. Keep it confident and genuine — not arrogant, generic, or cliché. No " +
    "hashtags, no emojis, no quotation marks around the result. Return ONLY the bio text.";

  const system = isProgram
    ? "You polish a college baseball program's 'About' blurb for recruits on a college-recruiting app. " +
      "A coach wrote rough notes about their program; your job is to turn them into a confident, authentic " +
      "description a recruit would want to read — leading with what makes the program worth choosing (culture, " +
      "player development, facilities, results, academics, and where they send players). " +
      "Rules: keep it to 3-5 sentences, under ~500 characters. Use ONLY facts the coach gave you — never invent or " +
      "inflate records, facilities, pipelines, rankings, or results. Fix grammar, tighten the language, and frame the " +
      "real details persuasively. Keep it genuine — not arrogant, generic, or cliché. No hashtags, no emojis, no " +
      "quotation marks around the result. Return ONLY the rewritten blurb."
    : isGenerate
      ? playerGenerateSystem
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
    : isGenerate
      ? `Player profile:\n${playerFacts}${
          text ? `\n\nTheir own words (optional, weave in if useful):\n${text}` : ""
        }\n\nWrite the recruiting bio.`
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
