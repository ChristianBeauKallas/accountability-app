import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeStreak, localDate } from "@/lib/streaks";
import type { CoachingTracker, CoachingEntry } from "@/lib/types";
import { Avatar } from "../../avatar";
import CoachFeedback from "./coach-feedback";

export const dynamic = "force-dynamic";

function fmtTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function CoachClientPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rel } = await supabase
    .from("coaching_relationships")
    .select("id")
    .eq("coach_id", user.id)
    .eq("client_id", clientId)
    .maybeSingle();
  if (!rel) notFound();

  const { data: client } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, timezone")
    .eq("id", clientId)
    .maybeSingle();
  const tz = client?.timezone ?? "America/New_York";
  const today = localDate(new Date(), tz);

  const [{ data: trackers }, { data: recent }] = await Promise.all([
    supabase
      .from("coaching_trackers")
      .select("*")
      .eq("relationship_id", rel.id)
      .order("sort_order"),
    supabase
      .from("coaching_entries")
      .select(
        "id, tracker_id, happened_at, detail, amount, calories, protein_g, carbs_g, fat_g, macros_source, logged_at",
      )
      .eq("relationship_id", rel.id)
      .gte("happened_at", new Date(Date.now() - 60 * 86400000).toISOString())
      .order("happened_at", { ascending: true }),
  ]);

  const allTrackers = (trackers ?? []) as CoachingTracker[];
  const trackerById = new Map(allTrackers.map((t) => [t.id, t]));
  const entries = (recent ?? []) as CoachingEntry[];

  // Streak (consecutive days with any entry).
  const daySet = new Set(entries.map((e) => localDate(e.happened_at, tz)));
  const { streak } = computeStreak(daySet, tz);

  // Today's timeline.
  const todayEntries = entries.filter(
    (e) => localDate(e.happened_at, tz) === today,
  );
  const loggedToday = new Set(todayEntries.map((e) => e.tracker_id));
  const adherence =
    allTrackers.length > 0
      ? Math.round((loggedToday.size / allTrackers.length) * 100)
      : 0;

  // Today's macro totals.
  const mt = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  for (const e of todayEntries) {
    if (e.calories) mt.calories += e.calories;
    if (e.protein_g) mt.protein_g += Number(e.protein_g);
    if (e.carbs_g) mt.carbs_g += Number(e.carbs_g);
    if (e.fat_g) mt.fat_g += Number(e.fat_g);
  }

  // 7-day adherence bars.
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    days.push(localDate(d, tz));
  }
  const byDayTrackers = new Map<string, Set<string>>();
  for (const e of entries) {
    const d = localDate(e.happened_at, tz);
    const s = byDayTrackers.get(d) ?? new Set<string>();
    s.add(e.tracker_id);
    byDayTrackers.set(d, s);
  }
  const bars = days.map((d) => ({
    day: d,
    pct:
      allTrackers.length > 0
        ? Math.round(((byDayTrackers.get(d)?.size ?? 0) / allTrackers.length) * 100)
        : 0,
  }));

  // Weight trend.
  const weightTracker = allTrackers.find((t) =>
    t.label.toLowerCase().includes("weight"),
  );
  const weights = weightTracker
    ? entries
        .filter((e) => e.tracker_id === weightTracker.id && e.amount != null)
        .map((e) => ({ at: e.happened_at, v: e.amount as number }))
    : [];

  // Progress-selfie strip: photo trackers that are once/day.
  const selfieTrackerIds = new Set(
    allTrackers.filter((t) => t.wants_photo && !t.repeatable).map((t) => t.id),
  );
  const selfieEntries = entries.filter((e) => selfieTrackerIds.has(e.tracker_id));

  // Sign media for today's entries + all selfie entries.
  const mediaEntryIds = [
    ...new Set([...todayEntries.map((e) => e.id), ...selfieEntries.map((e) => e.id)]),
  ];
  const photosByEntry = new Map<string, string[]>();
  if (mediaEntryIds.length > 0) {
    const { data: media } = await supabase
      .from("media")
      .select("entry_id, storage_path")
      .in("entry_id", mediaEntryIds)
      .eq("type", "image");
    const rows = (media ?? []) as { entry_id: string; storage_path: string }[];
    if (rows.length > 0) {
      const { data: signed } = await supabase.storage
        .from("media")
        .createSignedUrls(
          rows.map((r) => r.storage_path),
          60 * 60,
        );
      const urlByPath = new Map(
        (signed ?? [])
          .filter((s) => s.signedUrl && s.path)
          .map((s) => [s.path as string, s.signedUrl]),
      );
      for (const r of rows) {
        const url = urlByPath.get(r.storage_path);
        if (!url) continue;
        const arr = photosByEntry.get(r.entry_id) ?? [];
        arr.push(url);
        photosByEntry.set(r.entry_id, arr);
      }
    }
  }
  const selfiePhotos = selfieEntries
    .flatMap((e) =>
      (photosByEntry.get(e.id) ?? []).map((url) => ({ url, at: e.happened_at })),
    )
    .sort((a, b) => a.at.localeCompare(b.at));

  const { data: fb } = await supabase
    .from("coaching_feedback")
    .select("body")
    .eq("relationship_id", rel.id)
    .eq("day", today)
    .maybeSingle();

  // Today's logged workout (actual sets + effort).
  const { data: wlog } = await supabase
    .from("coaching_workout_logs")
    .select("id, title, effort")
    .eq("relationship_id", rel.id)
    .eq("day", today)
    .maybeSingle();
  const woByExercise = new Map<
    string,
    { set_index: number; weight: number | null; reps: number | null }[]
  >();
  if (wlog) {
    const { data: s } = await supabase
      .from("coaching_exercise_sets")
      .select("exercise_name, set_index, weight, reps")
      .eq("workout_log_id", wlog.id)
      .order("set_index");
    for (const row of (s ?? []) as {
      exercise_name: string;
      set_index: number;
      weight: number | null;
      reps: number | null;
    }[]) {
      const arr = woByExercise.get(row.exercise_name) ?? [];
      arr.push(row);
      woByExercise.set(row.exercise_name, arr);
    }
  }

  const name = client?.display_name ?? "Client";
  const latestWeight = weights.length ? weights[weights.length - 1].v : null;
  const firstWeight = weights.length ? weights[0].v : null;
  const weightDelta =
    latestWeight != null && firstWeight != null
      ? Math.round((latestWeight - firstWeight) * 10) / 10
      : null;

  return (
    <main className="board coach-dash">
      <header className="board-head">
        <div className="board-head-top">
          <div>
            <h1>{name}</h1>
            <p className="subtitle">
              <Link href="/coach">‹ Clients</Link>
            </p>
          </div>
          <Avatar name={name} url={client?.avatar_url ?? null} />
        </div>
      </header>

      <Link href={`/coach/${clientId}/plan`} className="plan-banner build">
        📋 Manage plan ›
      </Link>

      <section className="coach-stats">
        <div className="cstat">
          <span className="cstat-n">{streak}🔥</span>
          <span className="cstat-l">Streak</span>
        </div>
        <div className="cstat">
          <span className="cstat-n">{adherence}%</span>
          <span className="cstat-l">Today</span>
        </div>
        {latestWeight != null && (
          <div className="cstat">
            <span className="cstat-n">
              {latestWeight}
              {weightTracker?.unit ?? ""}
            </span>
            <span className="cstat-l">
              {weightDelta != null && weightDelta !== 0
                ? `${weightDelta > 0 ? "+" : ""}${weightDelta} so far`
                : "Weight"}
            </span>
          </div>
        )}
      </section>

      {mt.calories > 0 && (
        <section className="macro-totals">
          <span className="mt-cal">{mt.calories} kcal today</span>
          <span className="mt-macros">
            <b>{Math.round(mt.protein_g)}g</b> P ·{" "}
            <b>{Math.round(mt.carbs_g)}g</b> C · <b>{Math.round(mt.fat_g)}g</b> F
          </span>
        </section>
      )}

      {/* 7-day adherence */}
      <section className="panel">
        <h2>Last 7 days</h2>
        <div className="adh-bars">
          {bars.map((b) => (
            <div className="adh-col" key={b.day}>
              <div className="adh-track">
                <div className="adh-fill" style={{ height: `${b.pct}%` }} />
              </div>
              <span className="adh-day">
                {new Intl.DateTimeFormat("en-US", {
                  timeZone: tz,
                  weekday: "narrow",
                }).format(new Date(b.day + "T12:00:00"))}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Progress selfies */}
      {selfiePhotos.length > 0 && (
        <section className="panel">
          <h2>Progress</h2>
          <div className="selfie-strip">
            {selfiePhotos.map((p, i) => (
              <figure className="selfie" key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" />
                <figcaption>
                  {new Intl.DateTimeFormat("en-US", {
                    timeZone: tz,
                    month: "short",
                    day: "numeric",
                  }).format(new Date(p.at))}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Coach feedback */}
      <section className="panel">
        <h2>Today&apos;s note</h2>
        <CoachFeedback
          relationshipId={rel.id}
          coachId={user.id}
          day={today}
          initial={(fb as { body: string } | null)?.body ?? ""}
        />
      </section>

      {/* Today's logged workout */}
      {wlog && woByExercise.size > 0 && (
        <section className="panel">
          <h2>
            Today&apos;s workout
            {wlog.effort && <span className="wo-effort-tag">felt {wlog.effort}</span>}
          </h2>
          {[...woByExercise.entries()].map(([exName, sets]) => (
            <div className="cw-ex" key={exName}>
              <span className="cw-name">{exName}</span>
              <span className="cw-sets">
                {sets
                  .map((s) => `${s.weight ?? "—"}×${s.reps ?? "—"}`)
                  .join("  ·  ")}
              </span>
            </div>
          ))}
        </section>
      )}

      {/* Today's timeline */}
      <section className="panel">
        <h2>Today&apos;s log</h2>
        {todayEntries.length === 0 && (
          <p className="empty">Nothing logged yet today.</p>
        )}
        <div className="timeline">
          {todayEntries.map((e) => {
            const t = trackerById.get(e.tracker_id);
            const photos = photosByEntry.get(e.id) ?? [];
            const late =
              new Date(e.logged_at).getTime() - new Date(e.happened_at).getTime() >
              90 * 60 * 1000;
            return (
              <div key={e.id} className="tl-entry">
                <span className="tl-time">{fmtTime(e.happened_at, tz)}</span>
                <span className="tl-emoji">{t?.emoji ?? "✅"}</span>
                <span className="tl-body">
                  <span className="tl-label">
                    {t?.label ?? "Logged"}
                    {e.amount != null && (
                      <span className="tl-amt">
                        {" "}
                        {e.amount}
                        {t?.unit ?? ""}
                      </span>
                    )}
                    {late && <span className="tl-late">logged later</span>}
                  </span>
                  {e.detail && <span className="tl-detail">{e.detail}</span>}
                  {e.calories != null && (
                    <span className="tl-macro">
                      {e.calories} kcal · {Math.round(Number(e.protein_g ?? 0))}P
                      · {Math.round(Number(e.carbs_g ?? 0))}C ·{" "}
                      {Math.round(Number(e.fat_g ?? 0))}F
                    </span>
                  )}
                </span>
                {photos.length > 0 && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="tl-photo" src={photos[0]} alt="" />
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
