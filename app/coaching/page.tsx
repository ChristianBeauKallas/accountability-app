import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { computeStreak, localDate } from "@/lib/streaks";
import type {
  CoachingTracker,
  CoachingEntry,
  SavedMeal,
  CoachingPlan,
} from "@/lib/types";
import CoachingLog from "./coaching-log";

const WD: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

export const dynamic = "force-dynamic";

export default async function CoachingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // The relationship where I'm the client (being coached).
  const { data: rels } = await supabase
    .from("coaching_relationships")
    .select("id, coach_id")
    .eq("client_id", user.id)
    .limit(1);
  const rel = rels?.[0] as { id: string; coach_id: string } | undefined;

  if (!rel) {
    return (
      <main className="board">
        <header className="board-head">
          <div className="board-head-top">
            <div>
              <h1>My Plan</h1>
              <p className="subtitle">
                <Link href="/">‹ Feed</Link>
              </p>
            </div>
          </div>
        </header>
        <div className="notice">
          You don&apos;t have a plan yet. Start your own from Settings →
          Coaching, or ask whoever&apos;s holding you accountable to add you.
        </div>
      </main>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle();
  const tz = profile?.timezone ?? "America/New_York";
  const today = localDate(new Date(), tz);

  const [{ data: trackers }, { data: recent }] = await Promise.all([
    supabase
      .from("coaching_trackers")
      .select("*")
      .eq("relationship_id", rel.id)
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("coaching_entries")
      .select(
        "id, tracker_id, happened_at, detail, amount, calories, protein_g, carbs_g, fat_g, macros_source, logged_at",
      )
      .eq("relationship_id", rel.id)
      .gte(
        "happened_at",
        new Date(Date.now() - 120 * 86400000).toISOString(),
      )
      .order("happened_at", { ascending: false }),
  ]);

  const allTrackers = (trackers ?? []) as CoachingTracker[];
  const allEntries = (recent ?? []) as CoachingEntry[];

  // Streak: consecutive days (their tz) with at least one entry.
  const daySet = new Set(allEntries.map((e) => localDate(e.happened_at, tz)));
  const { streak } = computeStreak(daySet, tz);

  // Today's entries + their photos.
  const todayEntries = allEntries.filter(
    (e) => localDate(e.happened_at, tz) === today,
  );
  const todayIds = todayEntries.map((e) => e.id);
  const photosByEntry = new Map<string, string[]>();
  if (todayIds.length > 0) {
    const { data: media } = await supabase
      .from("media")
      .select("entry_id, storage_path")
      .in("entry_id", todayIds)
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
  const entriesWithPhotos: CoachingEntry[] = todayEntries.map((e) => ({
    ...e,
    photos: photosByEntry.get(e.id) ?? [],
  }));

  // Coach's note for today.
  const { data: fb } = await supabase
    .from("coaching_feedback")
    .select("body")
    .eq("relationship_id", rel.id)
    .eq("day", today)
    .maybeSingle();

  // Adherence today: distinct trackers logged / active trackers.
  const loggedTrackerIds = new Set(todayEntries.map((e) => e.tracker_id));
  const adherence =
    allTrackers.length > 0
      ? Math.round((loggedTrackerIds.size / allTrackers.length) * 100)
      : 0;

  // Today's macro totals (across all entries that carry macros).
  const totals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  for (const e of todayEntries) {
    if (e.calories) totals.calories += e.calories;
    if (e.protein_g) totals.protein_g += Number(e.protein_g);
    if (e.carbs_g) totals.carbs_g += Number(e.carbs_g);
    if (e.fat_g) totals.fat_g += Number(e.fat_g);
  }

  // Saved meals + recent distinct meals (for one-tap re-logging).
  const mealTrackerIds = new Set(
    allTrackers.filter((t) => t.wants_macros).map((t) => t.id),
  );
  const recentMeals: SavedMeal[] = [];
  const seenDetail = new Set<string>();
  for (const e of allEntries) {
    if (!mealTrackerIds.has(e.tracker_id)) continue;
    const d = (e.detail ?? "").trim();
    if (!d || seenDetail.has(d.toLowerCase())) continue;
    seenDetail.add(d.toLowerCase());
    recentMeals.push({
      id: `recent-${e.id}`,
      name: d,
      detail: d,
      calories: e.calories,
      protein_g: e.protein_g,
      carbs_g: e.carbs_g,
      fat_g: e.fat_g,
    });
    if (recentMeals.length >= 8) break;
  }
  const { data: saved } = await supabase
    .from("coaching_saved_meals")
    .select("id, name, detail, calories, protein_g, carbs_g, fat_g")
    .eq("relationship_id", rel.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Active plan → today's weekday, targets, and prescribed workout.
  const wdShort = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
  }).format(new Date());
  const todayWeekday = WD[wdShort] ?? 1;

  const { data: planRows } = await supabase
    .from("coaching_plans")
    .select("*")
    .eq("relationship_id", rel.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);
  const plan = (planRows?.[0] ?? null) as CoachingPlan | null;

  let todayWorkout: {
    title: string;
    detail: string | null;
    exercises: { name: string; sets?: number; reps?: string; cue?: string }[] | null;
    planWorkoutId: string | null;
    adjusted: boolean;
    adjustNote: string | null;
    adjustReason: string | null;
  } | null = null;
  if (plan) {
    const { data: w } = await supabase
      .from("coaching_plan_workouts")
      .select("id, title, detail, exercises")
      .eq("plan_id", plan.id)
      .eq("weekday", todayWeekday)
      .maybeSingle();
    if (w)
      todayWorkout = {
        title: w.title as string,
        detail: (w.detail as string) ?? null,
        exercises: (w.exercises as never) ?? null,
        planWorkoutId: (w.id as string) ?? null,
        adjusted: false,
        adjustNote: null,
        adjustReason: null,
      };

    // Did the client rework today's session? That overrides the card.
    const { data: adj } = await supabase
      .from("coaching_workout_adjustments")
      .select("title, detail, exercises, note, reason")
      .eq("relationship_id", rel.id)
      .eq("day", today)
      .maybeSingle();
    if (adj) {
      todayWorkout = {
        title: (adj.title as string) ?? todayWorkout?.title ?? "Adjusted workout",
        detail: (adj.detail as string) ?? null,
        exercises: (adj.exercises as never) ?? null,
        planWorkoutId: todayWorkout?.planWorkoutId ?? null,
        adjusted: true,
        adjustNote: (adj.note as string) ?? null,
        adjustReason: (adj.reason as string) ?? null,
      };
    }
  }

  // When you run your own plan you're both sides — send yourself to the
  // builder instead of telling yourself to "hang tight".
  const selfCoached = rel.coach_id === user.id;
  const manageHref = selfCoached ? `/coach/${user.id}/plan` : null;

  // Build/waiting banner when there's no active plan.
  let buildBanner: { text: string; href: string | null } | null = null;
  if (!plan) {
    const { data: intake } = await supabase
      .from("coaching_intakes")
      .select("id")
      .eq("relationship_id", rel.id)
      .order("submitted_at", { ascending: false })
      .limit(1);
    if (intake?.[0]) {
      buildBanner = selfCoached
        ? { text: "Finish building your plan", href: manageHref }
        : { text: "Your coach is building your plan — hang tight", href: null };
    } else {
      buildBanner = { text: "Build your plan", href: "/coaching/intake" };
    }
  }

  return (
    <CoachingLog
      relationshipId={rel.id}
      userId={user.id}
      trackers={allTrackers}
      initialEntries={entriesWithPhotos}
      streak={streak}
      adherence={adherence}
      coachNote={(fb as { body: string } | null)?.body ?? null}
      macroTotals={totals}
      savedMeals={(saved ?? []) as SavedMeal[]}
      recentMeals={recentMeals}
      todayWeekday={plan ? todayWeekday : null}
      targets={
        plan
          ? {
              calorie: plan.calorie_target,
              protein: plan.protein_target,
              water: plan.water_target,
            }
          : null
      }
      planSummary={plan?.summary ?? null}
      todayWorkout={todayWorkout}
      today={today}
      buildBanner={buildBanner}
      manageHref={plan ? manageHref : null}
    />
  );
}
