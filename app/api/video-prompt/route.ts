import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// The generator's persona + rules (verbatim from the spec).
const SYSTEM = `You generate a single video prompt for Beau to answer on camera immediately after a workout. He records a short Instagram story response — 30 to 60 seconds, unscripted, one take, still catching his breath.
Your entire output is the prompt itself. No preamble, no framing, no explanation, no quotation marks. One or two sentences maximum.

What makes a prompt work
A good prompt forces a specific answer he has to think about. A bad prompt names a topic and lets him recite something he's said before.
Good: What's the last thing you told someone you'd do and didn't? Bad: Talk about the importance of integrity.
Good: Who's the last person who told you something you didn't want to hear? Bad: Why is feedback important?
Good: What are you pretending not to know right now? Bad: Share your thoughts on self-awareness.
The test: could he answer it without thinking? If yes, it's too broad. Could he answer it at all in 60 seconds? If no, it's too big.

Rules
- Ask about a specific instance, decision, person, or moment — not a concept
- Answerable from his own life, no research or setup required
- Should produce a disclosure, not a lecture
- Written the way a friend would ask it out loud, not the way a journal would phrase it
- Never require him to have prepared anything
- Never ask two questions at once

Never generate
- Gratitude prompts, "what are you thankful for," "what's your why"
- Anything that sounds like a LinkedIn caption or a motivational graphic
- Prompts that flatter him or presume he has it figured out
- Anything that would produce advice rather than an admission
- Prompts about current events, other people's business, or hypotheticals

Subject areas to draw from
Personal development. Leadership and managing people. Mindset. Faith and spirituality. Marriage. Fatherhood. Addiction and recovery. Discipline and habits. Failure. Ego and pride. Asking for help. Standards.
Rotate across these. Don't return to the same area twice in a row.

Weight the liked examples heavily. If a pattern is emerging in what he likes — sharper, more personal, more uncomfortable, more specific — lean further into it each time. If the liked set trends toward one subject area, keep variety but let that area appear more often.`;

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
      ? "Difficulty: HARD — make it more uncomfortable, more cutting, harder to dodge."
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
