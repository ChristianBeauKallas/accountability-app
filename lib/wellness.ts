// Pure, client-safe types + helpers. Server-only data loading lives in
// lib/wellness-server.ts so this module can be imported from client components.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type Program = {
  id: string;
  name: string;
  days_goal: number;
  mins_per_day: number;
  bank_hours_per_month: number;
  monthly_bonus_cents: number;
  invite_code: string;
  created_by: string | null;
  created_at: string;
};

export type Member = {
  id: string;
  program_id: string;
  name: string;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
};

export type CheckIn = {
  id: string;
  member_id: string;
  program_id: string;
  photo_url: string | null;
  lat: number | null;
  lng: number | null;
  place: string | null;
  description: string | null;
  duration_minutes: number;
  created_at: string;
};

export type Viewer = {
  userId: string;
  member: Member;
  program: Program;
};

// ---------------------------------------------------------------------------
// Stats math
// ---------------------------------------------------------------------------
const dayKey = (iso: string) => iso.slice(0, 10); // YYYY-MM-DD (UTC)
const monthKey = (iso: string) => iso.slice(0, 7); // YYYY-MM

export type Stats = {
  goal: number;
  qualifyingDays: number; // this month
  activeDays: number; // this month
  totalMinutes: number; // this month
  bankedHours: number; // accrued this calendar year
  bankCap: number; // hours per month * 12
  remaining: number; // days left to hit goal this month
  earnedThisMonth: boolean;
};

// Computes a member's progress from their check-ins. A day "qualifies" when its
// combined minutes reach the program's mins_per_day; a month is "earned" when
// its qualifying days reach days_goal, banking bank_hours_per_month (capped at
// a full year).
export function computeStats(
  checkins: Pick<CheckIn, "created_at" | "duration_minutes">[],
  program: Program,
  now: Date = new Date(),
): Stats {
  const year = now.toISOString().slice(0, 4);
  const thisMonth = now.toISOString().slice(0, 7);

  // month -> day -> minutes
  const byMonth = new Map<string, Map<string, number>>();
  for (const c of checkins) {
    if (!c.created_at.startsWith(year)) continue;
    const mk = monthKey(c.created_at);
    const dk = dayKey(c.created_at);
    const days = byMonth.get(mk) ?? new Map<string, number>();
    days.set(dk, (days.get(dk) ?? 0) + (c.duration_minutes || 0));
    byMonth.set(mk, days);
  }

  const qualifyingDaysIn = (days: Map<string, number> | undefined) => {
    if (!days) return 0;
    let n = 0;
    for (const mins of days.values()) if (mins >= program.mins_per_day) n++;
    return n;
  };

  // Banked hours: every month this year that reached the goal.
  let earnedMonths = 0;
  for (const days of byMonth.values()) {
    if (qualifyingDaysIn(days) >= program.days_goal) earnedMonths++;
  }
  const bankCap = program.bank_hours_per_month * 12;
  const bankedHours = Math.min(earnedMonths * program.bank_hours_per_month, bankCap);

  const monthDays = byMonth.get(thisMonth);
  const qualifyingDays = qualifyingDaysIn(monthDays);
  const activeDays = monthDays ? monthDays.size : 0;
  let totalMinutes = 0;
  if (monthDays) for (const m of monthDays.values()) totalMinutes += m;

  return {
    goal: program.days_goal,
    qualifyingDays,
    activeDays,
    totalMinutes,
    bankedHours,
    bankCap,
    remaining: Math.max(0, program.days_goal - qualifyingDays),
    earnedThisMonth: qualifyingDays >= program.days_goal,
  };
}

// Qualifying days this month for each member id (admin roster).
export function qualifyingDaysByMember(
  checkins: Pick<CheckIn, "member_id" | "created_at" | "duration_minutes">[],
  program: Program,
  now: Date = new Date(),
): Map<string, number> {
  const thisMonth = now.toISOString().slice(0, 7);
  // member -> day -> minutes
  const byMember = new Map<string, Map<string, number>>();
  for (const c of checkins) {
    if (monthKey(c.created_at) !== thisMonth) continue;
    const days = byMember.get(c.member_id) ?? new Map<string, number>();
    const dk = dayKey(c.created_at);
    days.set(dk, (days.get(dk) ?? 0) + (c.duration_minutes || 0));
    byMember.set(c.member_id, days);
  }
  const out = new Map<string, number>();
  for (const [mid, days] of byMember) {
    let n = 0;
    for (const mins of days.values()) if (mins >= program.mins_per_day) n++;
    out.set(mid, n);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
export const formatMoney = (cents: number) => {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
};

export const formatHours = (h: number) =>
  Number.isInteger(h) ? `${h}` : h.toFixed(1);

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function timeAgo(iso: string, now: Date = new Date()): string {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// Short, stable invite code from a program name + randomness.
export function makeInviteCode(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 18);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${slug || "team"}-${rand}`;
}
