import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeStreak, localDate, fullCompletionDays } from "@/lib/streaks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const W = 1080;
const H = 1920;

const ACCENT = "#3ee87a";
const ACCENT_2 = "#74f6a0";
const ACCENT_DIM = "rgba(62,232,122,0.18)";
const MUTED = "#8b95a5";
const WHITE = "#eef1f6";

// A ring as an inline SVG data URI (no text inside — labels are drawn by Satori
// with the bundled font, so we never depend on system fonts in the raster).
function ringDataUri(
  fraction: number,
  size: number,
  stroke: number,
  track = "rgba(255,255,255,0.12)",
  fg = ACCENT,
) {
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - Math.max(0, Math.min(1, fraction)));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/>
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${fg}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${off}" transform="rotate(-90 ${c} ${c})"/>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;

  // Must be signed in, and can only render your OWN post (these are private).
  const server = await createServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) return new NextResponse("Sign in", { status: 401 });

  const admin = createAdminClient();

  const { data: post } = await admin
    .from("group_posts")
    .select(
      "id, author_id, group_id, created_at, media(type, storage_path)",
    )
    .eq("id", postId)
    .maybeSingle();
  if (!post) return new NextResponse("Not found", { status: 404 });
  if (post.author_id !== user.id)
    return new NextResponse("Forbidden", { status: 403 });

  const [{ data: group }, { data: activities }, { data: profile }, { data: posts }] =
    await Promise.all([
      admin.from("groups").select("name").eq("id", post.group_id).maybeSingle(),
      admin
        .from("activities")
        .select("id, name, emoji, created_at")
        .eq("group_id", post.group_id)
        .eq("active", true)
        .order("sort_order"),
      admin
        .from("profiles")
        .select("display_name, timezone, created_at")
        .eq("id", user.id)
        .maybeSingle(),
      admin
        .from("group_posts")
        .select("created_at, post_activities(activity_id)")
        .eq("author_id", user.id)
        .eq("group_id", post.group_id)
        .limit(500),
    ]);

  const acts = (activities ?? []) as {
    id: string;
    name: string;
    emoji: string | null;
    created_at: string;
  }[];
  const activityById = new Map(acts.map((a) => [a.id, a]));
  const total = acts.length;
  const tz = profile?.timezone ?? "America/New_York";
  const groupName = group?.name ?? "Get Better";
  const displayName = profile?.display_name ?? "Member";

  // Per-day logged activities → full-completion days → streak & tallies.
  const actsByDay = new Map<string, Set<string>>();
  for (const p of posts ?? []) {
    const day = localDate(p.created_at as string, tz);
    let set = actsByDay.get(day);
    if (!set) {
      set = new Set<string>();
      actsByDay.set(day, set);
    }
    for (const pa of (p.post_activities ?? []) as { activity_id: string }[])
      if (activityById.has(pa.activity_id)) set.add(pa.activity_id);
  }
  const startDays = acts.map((a) => localDate(a.created_at, tz));
  const dates = fullCompletionDays(actsByDay, startDays);
  const { streak } = computeStreak(dates, tz);
  const daysWon = dates.size;

  const nowLocal = localDate(new Date(), tz);
  const monthPrefix = nowLocal.slice(0, 7);
  const thisMonth = [...dates].filter((d) => d.slice(0, 7) === monthPrefix).length;
  const dayOfMonth = Number(nowLocal.slice(8, 10));
  const accountDays = Math.max(
    1,
    Math.floor(
      (Date.now() - new Date(profile?.created_at ?? Date.now()).getTime()) /
        86400000,
    ) + 1,
  );
  const possible = Math.min(dayOfMonth, accountDays);

  // The post's day completion drives the hero ring + chips.
  const postDay = localDate(post.created_at, tz);
  const dayLogged = actsByDay.get(postDay) ?? new Set<string>();
  const doneCount = dayLogged.size;
  const fraction = total > 0 ? doneCount / total : 0;
  const complete = total > 0 && doneCount >= total;
  const chips = acts
    .filter((a) => dayLogged.has(a.id))
    .map((a) => ({ emoji: a.emoji ?? "✅", name: a.name }));

  // Grayed-out, darkened photo backdrop (if the post has one).
  let photo: string | null = null;
  const imgMedia = (
    post.media as { type: string; storage_path: string }[]
  ).find((m) => m.type === "image");
  if (imgMedia) {
    try {
      const { data: blob } = await admin.storage
        .from("media")
        .download(imgMedia.storage_path);
      if (blob) {
        const out = await sharp(Buffer.from(await blob.arrayBuffer()))
          .resize(W, H, { fit: "cover", position: "attention" })
          .grayscale()
          .modulate({ brightness: 0.5 })
          .jpeg({ quality: 78 })
          .toBuffer();
        photo = `data:image/jpeg;base64,${out.toString("base64")}`;
      }
    } catch {
      /* no backdrop — fall through to the gradient */
    }
  }

  // Stats strip — drop zero-value tiles so a brand-new day never shows "0".
  type Stat = { n: string; l: string; hero?: boolean };
  const stats: Stat[] = [];
  if (streak > 0) stats.push({ n: `🔥 ${streak}`, l: "Day streak", hero: true });
  stats.push({ n: `${thisMonth}/${possible}`, l: "📅 This month" });
  if (daysWon > 0) stats.push({ n: `${daysWon}`, l: "✅ Days won" });
  if (!stats.some((s) => s.hero) && stats.length) stats[0].hero = true;

  const monthLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date(post.created_at));

  const fontDir = path.join(process.cwd(), "assets/fonts");
  const [medium, bold, extrabold] = await Promise.all([
    fs.readFile(path.join(fontDir, "Inter-Medium.ttf")),
    fs.readFile(path.join(fontDir, "Inter-Bold.ttf")),
    fs.readFile(path.join(fontDir, "Inter-ExtraBold.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          position: "relative",
          fontFamily: "Inter",
          backgroundColor: "#07090c",
          backgroundImage:
            "radial-gradient(120% 60% at 50% 18%, #12202b 0%, #0a0f16 55%, #05070a 100%)",
        }}
      >
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            width={W}
            height={H}
            style={{ position: "absolute", top: 0, left: 0 }}
          />
        )}
        {/* veil */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: W,
            height: H,
            display: "flex",
            backgroundImage:
              "linear-gradient(180deg, rgba(5,7,10,0.55) 0%, rgba(5,7,10,0.72) 42%, rgba(5,7,10,0.94) 100%)",
          }}
        />

        {/* content */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: W,
            height: H,
            padding: "120px 96px 96px",
          }}
        >
          {/* GB logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 128,
              height: 128,
              position: "relative",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ringDataUri(0.75, 128, 11)}
              width={128}
              height={128}
              style={{ position: "absolute", top: 0, left: 0 }}
            />
            <div style={{ display: "flex", fontSize: 44, fontWeight: 800, color: WHITE, letterSpacing: -2 }}>
              GB
            </div>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 26,
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: 8,
              color: "rgba(255,255,255,0.72)",
            }}
          >
            {groupName.toUpperCase()}
          </div>

          {/* hero ring */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 440,
              height: 440,
              marginTop: 64,
              position: "relative",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ringDataUri(fraction, 440, 30)}
              width={440}
              height={440}
              style={{ position: "absolute", top: 0, left: 0 }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", fontSize: 150, fontWeight: 800, color: WHITE, lineHeight: 1 }}>
                {doneCount}/{total}
              </div>
              <div
                style={{
                  display: "flex",
                  marginTop: 26,
                  fontSize: 27,
                  fontWeight: 800,
                  letterSpacing: 5,
                  color: ACCENT,
                }}
              >
                {complete ? "DAY COMPLETE" : "TODAY"}
              </div>
            </div>
          </div>

          {/* chips */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 16,
              marginTop: 56,
              maxWidth: 900,
            }}
          >
            {chips.map((c, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  backgroundColor: ACCENT_DIM,
                  border: `2px solid ${ACCENT}`,
                  borderRadius: 999,
                  padding: "12px 26px",
                  fontSize: 34,
                  fontWeight: 600,
                  color: ACCENT_2,
                }}
              >
                {c.emoji} {c.name}
              </div>
            ))}
          </div>

          {/* stat strip */}
          <div
            style={{
              display: "flex",
              marginTop: 56,
              width: "100%",
              border: "2px solid rgba(255,255,255,0.14)",
              borderRadius: 28,
              overflow: "hidden",
            }}
          >
            {stats.map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  flexGrow: s.hero ? 1.3 : 1,
                  padding: "30px 12px",
                  backgroundColor: s.hero ? ACCENT_DIM : "rgba(255,255,255,0.03)",
                  borderLeft: i === 0 ? "none" : "2px solid rgba(255,255,255,0.12)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: s.hero ? 88 : 66,
                    fontWeight: 800,
                    color: s.hero ? ACCENT : WHITE,
                  }}
                >
                  {s.n}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 27,
                    fontWeight: 700,
                    letterSpacing: 2,
                    color: s.hero ? ACCENT_2 : MUTED,
                  }}
                >
                  {s.l.toUpperCase()}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexGrow: 1 }} />

          {/* who */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 72,
                height: 72,
                borderRadius: 999,
                border: `3px solid ${ACCENT}`,
                backgroundColor: "#22303f",
                fontSize: 34,
                fontWeight: 800,
                color: WHITE,
              }}
            >
              {displayName.trim().charAt(0).toUpperCase() || "?"}
            </div>
            <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: WHITE }}>
              {displayName}
            </div>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 500, color: "rgba(255,255,255,0.66)" }}>
              · {monthLabel}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      emoji: "twemoji",
      fonts: [
        { name: "Inter", data: medium, weight: 500, style: "normal" },
        { name: "Inter", data: bold, weight: 700, style: "normal" },
        { name: "Inter", data: extrabold, weight: 800, style: "normal" },
      ],
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    },
  );
}
