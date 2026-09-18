import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// The generator's persona + rules.
const SYSTEM = `You generate a single video prompt for Beau to answer on camera immediately after a workout. He records a short Instagram story response — 30 to 60 seconds, unscripted, one take, still catching his breath.

Every prompt asks Beau to speak TO a former version of himself — a specific earlier self at a real moment, age, or season of his life — and give that self advice, perspective, a warning, or the truth he most needed to hear. He is the older, steadier one talking back to who he used to be.

Your entire output is the prompt itself. No preamble, no framing, no explanation, no quotation marks. One or two sentences maximum.

What makes a prompt work
A good prompt points at a SPECIFIC former self — a real moment or season he can picture — so the advice is earned and personal, not a motivational quote aimed at no one.
Good: What would you tell the version of you in the worst stretch of your recovery — not the pep talk, the real thing? Bad: What advice would you give your younger self? (which self? too vague)
Good: You, the first time you led people and had no clue what you were doing — what do you wish you'd known? Bad: Talk about leadership lessons.
Good: What does the version of you from the hardest season of your marriage need to hear from you now? Bad: Share your thoughts on marriage.
The test: can he picture the exact former self it points at? If not, it's too vague. Can he say something real to that self in 60 seconds? If it would take a lecture, narrow the moment.

Rules
- Point at a SPECIFIC former self — a moment, age, decision, or season he can name — never "your younger self" in the abstract
- Answerable from his own life, no research or setup required
- He is giving that former self advice, perspective, or the truth — that is the point
- Written the way you'd say it to a friend out loud, not the way a journal would phrase it
- Grounded and personal — earned wisdom, not a poster line
- Never require him to have prepared anything
- Never ask two things at once

Never generate
- Generic "advice to your younger self" with no specific self or moment named
- Gratitude prompts, "what are you thankful for," "what's your why"
- Anything that sounds like a LinkedIn caption or a motivational graphic
- Prompts that flatter him or presume he has it all figured out
- Prompts about current events, other people's business, or hypotheticals about strangers

Subject areas to draw from
Personal development. Leadership and managing people. Mindset. Faith and spirituality. Marriage. Fatherhood. Addiction and recovery. Discipline and habits. Failure. Ego and pride. Asking for help. Standards.
Rotate across these. Don't return to the same area twice in a row.

Weight the liked examples heavily. If a pattern is emerging in what he likes — a certain era, a certain kind of advice, more raw or more tender, more specific — lean further into it each time. If the liked set trends toward one subject area, keep variety but let that area appear more often.`;

async function callClaude(system: string, user: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  const model = process.env.PROMPT_MODEL || "claude-sonnet-4-5";
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(detail.slice(0, 200) || `HTTP ${resp.status}`);
  }
  const data = (await resp.json()) as { content?: { type: string; text?: string }[] };
  return (data.content?.find((c) => c.type === "text")?.text ?? "").trim();
}

const clean = (line: string) =>
  line
    .replace(/^\s*[-*\d.)\]]+\s*/, "") // strip bullets/numbering
    .replace(/^["“']|["”']$/g, "") // strip wrapping quotes
    .trim();

export async function POST(req: Request) {
  const user = await verifyBearer(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Owner-only: must own at least one group.
  const { data: owned } = await admin
    .from("groups")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!owned) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as {
    action?: "generate" | "seed";
    difficulty?: string;
  } | null;
  const action = body?.action === "seed" ? "seed" : "generate";
  const difficulty = body?.difficulty === "hard" ? "hard" : "normal";

  // Context: recent (avoid repeats), liked (study shape), disliked (avoid).
  const [{ data: recent }, { data: liked }, { data: disliked }] = await Promise.all([
    admin
      .from("video_prompts")
      .select("prompt")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("video_prompts")
      .select("prompt")
      .eq("owner_id", user.id)
      .eq("rating", "good")
      .order("created_at", { ascending: false })
      .limit(15),
    admin
      .from("video_prompts")
      .select("prompt")
      .eq("owner_id", user.id)
      .eq("rating", "bad")
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const list = (rows: { prompt: string }[] | null) =>
    (rows ?? []).map((r) => `- ${r.prompt}`).join("\n") || "(none yet)";

  const diffLine =
    difficulty === "hard"
      ? "Difficulty: HARD — point at a rawer, harder season, and ask for the advice he'd find hardest to give himself."
      : "Difficulty: normal.";

  try {
    if (action === "seed") {
      const userMsg = `${diffLine}

RECENT_PROMPTS:
${list(recent)}

LIKED_PROMPTS (study the shape, weight heavily):
${list(liked)}

DISLIKED_PROMPTS (understand why they missed, avoid that):
${list(disliked)}

Generate 10 distinct prompts following every rule above. Rotate across the subject areas — never the same area twice in a row. Output ONLY the 10 prompts, one per line, no numbering, no bullets, no blank lines.`;
      const raw = await callClaude(SYSTEM, userMsg);
      const prompts = raw
        .split("\n")
        .map(clean)
        .filter((l) => l.length > 8)
        .slice(0, 10);
      if (prompts.length === 0)
        return NextResponse.json({ error: "no prompts generated" }, { status: 502 });
      const { data: inserted, error } = await admin
        .from("video_prompts")
        .insert(prompts.map((p) => ({ owner_id: user.id, prompt: p, difficulty })))
        .select("id, prompt, rating, recorded, created_at");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, prompts: inserted });
    }

    const userMsg = `${diffLine}

RECENT_PROMPTS (do not repeat or near-repeat):
${list(recent)}

LIKED_PROMPTS (study the shape, weight heavily):
${list(liked)}

DISLIKED_PROMPTS (understand why they missed, avoid that failure mode):
${list(disliked)}

Output only the prompt.`;
    const raw = await callClaude(SYSTEM, userMsg);
    const prompt = clean(raw.split("\n").find((l) => clean(l).length > 8) ?? raw);
    if (!prompt) return NextResponse.json({ error: "empty prompt" }, { status: 502 });
    const { data: inserted, error } = await admin
      .from("video_prompts")
      .insert({ owner_id: user.id, prompt, difficulty })
      .select("id, prompt, rating, recorded, created_at")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, prompt: inserted });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error)?.message ?? "generation failed" },
      { status: 502 },
    );
  }
}
