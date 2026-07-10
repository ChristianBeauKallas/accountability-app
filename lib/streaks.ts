// Streak math, kept pure so it's easy to reason about and test.
//
// A "day" is a calendar date in the *member's own timezone* — so someone in
// LA and someone in NYC each get judged against their own midnight. Streaks
// are forgiving of "haven't posted yet today": your streak only breaks once a
// full day passes with no post.

/** The YYYY-MM-DD calendar date for an instant, in a given IANA timezone. */
export function localDate(iso: string | Date, timezone: string): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** The date string N days before the given YYYY-MM-DD (calendar math, DST-safe). */
function addDays(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

export type StreakInfo = {
  /** Consecutive days with a post, ending today (or yesterday if not yet posted today). */
  streak: number;
  /** Did they post today (their timezone)? */
  postedToday: boolean;
  /** Full days since their last post (0 if posted today, null if never posted). */
  daysSince: number | null;
};

/**
 * @param postDates  the set of YYYY-MM-DD local dates this member has posted
 * @param timezone   the member's timezone
 * @param now        current instant (injectable for tests)
 */
export function computeStreak(
  postDates: Set<string>,
  timezone: string,
  now: Date = new Date(),
): StreakInfo {
  const today = localDate(now, timezone);
  const postedToday = postDates.has(today);

  // Count back from today if they've posted today, otherwise from yesterday —
  // that grace keeps the streak alive until a whole day is actually missed.
  let cursor = postedToday ? today : addDays(today, -1);
  let streak = 0;
  while (postDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  // Days since last post.
  let daysSince: number | null = null;
  if (postDates.size > 0) {
    if (postedToday) {
      daysSince = 0;
    } else {
      let probe = today;
      let n = 0;
      // Walk back until we find the most recent posted day (cap to avoid loops).
      while (n < 3650 && !postDates.has(probe)) {
        probe = addDays(probe, -1);
        n += 1;
      }
      daysSince = postDates.has(probe) ? n : null;
    }
  }

  return { streak, postedToday, daysSince };
}
