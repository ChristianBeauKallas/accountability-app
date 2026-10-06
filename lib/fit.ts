import type { Player, Need, Program } from "@/lib/types";
import { stateClimate } from "@/lib/climate";

// ===========================================================================
// Fit scoring
// ---------------------------------------------------------------------------
// Two stages:
//   1. isEligible()  — HARD filters. Fail any → the need never shows.
//   2. computeFit()  — 0–100 soft score for ranking eligible needs.
//
// Tune the model from here: weights and knobs live at the top.
// (Phase 6 will layer on notifications + refine distance/keyword handling.)
// ===========================================================================

export const FIT_WEIGHTS = {
  distance: 25,
  metrics: 30,
  completeness: 20,
  mustHave: 25,
  size: 15,
} as const;

export const MAX_DISTANCE_MILES = 600; // beyond this, distance score ≈ 0

// Rough campus-size buckets by enrollment (for the soft size preference).
export function sizeBucket(enrollment: number | null): "small" | "medium" | "large" | null {
  if (enrollment == null) return null;
  if (enrollment < 4000) return "small";
  if (enrollment <= 12000) return "medium";
  return "large";
}

// --------------------------------------------------------------------------
// Hard filters
// --------------------------------------------------------------------------
export function positionsOverlap(a: string[], b: string[]): boolean {
  return a.some((p) => b.includes(p));
}

export function inPool(player: Player, need: Need): boolean {
  if (need.accepts_transfer && player.is_transfer) return true;
  if (player.grad_year == null) return false;
  const min = need.grad_year_min ?? -Infinity;
  const max = need.grad_year_max ?? Infinity;
  return player.grad_year >= min && player.grad_year <= max;
}

export function meetsGpa(player: Player, need: Need): boolean {
  if (!need.min_gpa) return true;
  return (player.gpa ?? 0) >= need.min_gpa;
}

export function isEligible(player: Player, need: Need): boolean {
  return (
    positionsOverlap(player.positions ?? [], need.positions ?? []) &&
    inPool(player, need) &&
    meetsGpa(player, need)
  );
}

// Player-side preferences: levels (divisions) and location (states or climate).
// Empty / unset preferences mean "no filter".
export function passesPlayerPrefs(
  player: Player,
  program: Pick<Program, "division" | "state">
): boolean {
  if (
    player.pref_divisions?.length &&
    !player.pref_divisions.includes(program.division)
  ) {
    return false;
  }
  if (player.pref_states?.length) {
    if (!program.state || !player.pref_states.includes(program.state)) {
      return false;
    }
  } else if (player.pref_climate && player.pref_climate !== "any") {
    if (stateClimate(program.state) !== player.pref_climate) return false;
  }
  return true;
}

// --------------------------------------------------------------------------
// Distance
// --------------------------------------------------------------------------
export function haversineMiles(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function distanceMiles(
  player: Player,
  program: Pick<Program, "lat" | "lng">
): number | null {
  if (
    player.lat == null ||
    player.lng == null ||
    program.lat == null ||
    program.lng == null
  ) {
    return null;
  }
  return haversineMiles(player.lat, player.lng, program.lat, program.lng);
}

// --------------------------------------------------------------------------
// Profile completeness (also surfaced in the UI)
// --------------------------------------------------------------------------
export function profileCompleteness(player: Player): number {
  const checks: boolean[] = [
    !!player.grad_year,
    !!player.primary_position,
    (player.positions?.length ?? 0) > 0,
    player.gpa != null,
    !!player.state,
    !!player.city,
    player.height_in != null,
    player.weight_lb != null,
    !!player.bats,
    !!player.throws,
    hasAnyMetric(player),
    !!player.bio,
  ];
  const filled = checks.filter(Boolean).length;
  return filled / checks.length;
}

function hasAnyMetric(player: Player): boolean {
  return [
    player.sixty_yd,
    player.exit_velo,
    player.inf_velo,
    player.of_velo,
    player.fastball_velo,
    player.pop_time,
  ].some((m) => m != null);
}

// --------------------------------------------------------------------------
// Sub-scores (each 0..1)
// --------------------------------------------------------------------------
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// higher value is better (velocity)
function scoreHigher(val: number | null, bar: number): number {
  if (val == null) return 0.4; // unknown → mild penalty
  return clamp01((val - bar) / (bar * 0.2) * 0.5 + 0.75);
}
// lower value is better (times)
function scoreLower(val: number | null, bar: number): number {
  if (val == null) return 0.4;
  return clamp01((bar - val) / (bar * 0.1) * 0.5 + 0.75);
}

function metricsScore(player: Player, need: Need): number | null {
  const parts: number[] = [];
  if (need.min_exit_velo != null)
    parts.push(scoreHigher(player.exit_velo, need.min_exit_velo));
  if (need.min_fastball_velo != null)
    parts.push(scoreHigher(player.fastball_velo, need.min_fastball_velo));
  if (need.min_sixty != null)
    parts.push(scoreLower(player.sixty_yd, need.min_sixty));
  if (need.min_pop_time != null)
    parts.push(scoreLower(player.pop_time, need.min_pop_time));
  if (parts.length === 0) return null; // need set no metric bar
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

function distanceScore(player: Player, program: Pick<Program, "lat" | "lng">) {
  const miles = distanceMiles(player, program);
  if (miles == null) return null;
  return clamp01(1 - miles / MAX_DISTANCE_MILES);
}

function mustHaveScore(player: Player, need: Need): number | null {
  const keywords = (need.must_have ?? []).map((k) => k.toLowerCase());
  if (keywords.length === 0) return null;
  const haystack = [
    player.bio ?? "",
    ...(player.positions ?? []),
    player.primary_position ?? "",
  ]
    .join(" ")
    .toLowerCase();
  const hits = keywords.filter((k) => haystack.includes(k)).length;
  // partial credit so a non-match isn't a dealbreaker (it's a soft signal)
  return 0.35 + 0.65 * (hits / keywords.length);
}

// Soft match on preferred campus size (0.2–1), null when no preference set.
function sizeScore(
  player: Player,
  program: Pick<Program, "enrollment">
): number | null {
  const pref = player.pref_size;
  if (!pref || pref === "any") return null;
  const bucket = sizeBucket(program.enrollment);
  if (bucket == null) return 0.5; // size unknown → neutral
  if (bucket === pref) return 1;
  const order = ["small", "medium", "large"];
  const gap = Math.abs(order.indexOf(bucket) - order.indexOf(pref));
  return gap === 1 ? 0.5 : 0.2;
}

// --------------------------------------------------------------------------
// Composite 0–100
// --------------------------------------------------------------------------
export function computeFit(
  player: Player,
  need: Need,
  program: Pick<Program, "lat" | "lng" | "enrollment">
): number {
  const factors: { weight: number; score: number | null }[] = [
    { weight: FIT_WEIGHTS.distance, score: distanceScore(player, program) },
    { weight: FIT_WEIGHTS.metrics, score: metricsScore(player, need) },
    { weight: FIT_WEIGHTS.completeness, score: profileCompleteness(player) },
    { weight: FIT_WEIGHTS.mustHave, score: mustHaveScore(player, need) },
    { weight: FIT_WEIGHTS.size, score: sizeScore(player, program) },
  ];

  let weighted = 0;
  let totalWeight = 0;
  for (const { weight, score } of factors) {
    if (score == null) continue; // factor not applicable → drop its weight
    weighted += weight * score;
    totalWeight += weight;
  }
  if (totalWeight === 0) return 50;
  return Math.round((weighted / totalWeight) * 100);
}
