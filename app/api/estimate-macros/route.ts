import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth-api";

export const runtime = "nodejs";

// Estimate calories + macros for a meal from a photo and/or a text description.
// Stateless: takes the image + text directly (before the entry is saved) and
// returns the numbers for the client to show, edit, and persist.
type Content =
  | { type: "text"; text: string }
  | {
      type: "image";
      source: { type: "base64"; media_type: string; data: string };
    };

export async function POST(req: Request) {
  const user = await verifyBearer(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key)
    return NextResponse.json(
      { error: "Macro estimation isn't set up yet (add ANTHROPIC_API_KEY)." },
      { status: 503 },
    );

  const body = (await req.json().catch(() => null)) as {
    image?: string;
    text?: string;
  } | null;
  const image = body?.image;
  const text = body?.text?.trim();
  if (!image && !text)
    return NextResponse.json({ error: "no input" }, { status: 400 });

  const content: Content[] = [];
  if (image) {
    let media_type = "image/jpeg";
    let data = image;
    const m = image.match(/^data:(image\/[\w.+-]+);base64,([\s\S]*)$/);
    if (m) {
      media_type = m[1];
      data = m[2];
    }
    content.push({ type: "image", source: { type: "base64", media_type, data } });
  }
  content.push({
    type: "text",
    text:
      "You are a nutrition estimator for a fitness coaching app. Estimate the meal" +
      (text ? ` (the person described it as: "${text}")` : "") +
      ". Identify each food with a realistic portion, then give per-item and total " +
      "calories and macros in grams. Use the description to resolve portions and " +
      "ingredients the photo can't show. Return ONLY valid JSON (no prose, no code " +
      'fences) in exactly this shape: {"items":[{"name":string,"portion":string,' +
      '"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number}],' +
      '"total":{"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number},' +
      '"confidence":"low"|"medium"|"high"}. Round to whole numbers. If you cannot ' +
      'identify any food, return zeros with confidence "low".',
  });

  const model = process.env.MACROS_MODEL || "claude-haiku-4-5-20251001";
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 800,
      messages: [{ role: "user", content }],
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    return NextResponse.json(
      { error: "estimate failed", detail: detail.slice(0, 200) },
      { status: 502 },
    );
  }

  const data = (await resp.json()) as {
    content?: { type: string; text?: string }[];
  };
  const raw = data.content?.find((c) => c.type === "text")?.text ?? "";
  const parsed = extractJson(raw);
  const total = parsed?.total;
  if (!total)
    return NextResponse.json({ error: "couldn't read the estimate" }, { status: 502 });

  return NextResponse.json({
    calories: Math.round(Number(total.calories) || 0),
    protein_g: Math.round(Number(total.protein_g) || 0),
    carbs_g: Math.round(Number(total.carbs_g) || 0),
    fat_g: Math.round(Number(total.fat_g) || 0),
    items: Array.isArray(parsed.items) ? parsed.items : [],
    confidence: parsed.confidence ?? "medium",
  });
}

type Parsed = {
  total?: {
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
  };
  items?: unknown[];
  confidence?: string;
};
function extractJson(s: string): Parsed | null {
  try {
    return JSON.parse(s) as Parsed;
  } catch {
    /* try to slice out the object */
  }
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(s.slice(start, end + 1)) as Parsed;
    } catch {
      /* give up */
    }
  }
  return null;
}
