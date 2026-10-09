import type { Division } from "@/lib/types";

// Baseball positions used across player profiles and needs.
export const POSITIONS = [
  "C",
  "1B",
  "2B",
  "3B",
  "SS",
  "LF",
  "CF",
  "RF",
  "OF",
  "RHP",
  "LHP",
  "DH",
  "UTIL",
] as const;

export const PITCHER_POSITIONS = ["RHP", "LHP"] as const;
export const CATCHER_POSITIONS = ["C"] as const;
export const INFIELD_POSITIONS = ["1B", "2B", "3B", "SS"] as const;
export const OUTFIELD_POSITIONS = ["LF", "CF", "RF", "OF"] as const;

export const DIVISIONS: Division[] = ["D2", "D3", "NAIA", "JUCO"];

export const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
] as const;

export const BATS = ["R", "L", "S"] as const;
export const THROWS = ["R", "L"] as const;

// Pitch arsenal — shown when a player's position is RHP/LHP.
export const PITCHES = [
  "Fastball",
  "2-Seam",
  "Cutter",
  "Sinker",
  "Slider",
  "Curveball",
  "Changeup",
  "Splitter",
  "Knuckleball",
] as const;

// ---------------------------------------------------------------------------
// Player level — where a player currently is. HS recruits vs. transfers, and
// what kind of school a transfer is coming from. Shared by player onboarding
// (single choice) and the need wizard (coaches target one or more).
// ---------------------------------------------------------------------------
export type PlayerLevel = "high_school" | "juco" | "four_year";

export const PLAYER_LEVELS: {
  value: PlayerLevel;
  label: string; // coach-facing ("target this type")
  self: string; // player-facing ("I'm a…")
  short: string; // compact chip on a post
}[] = [
  { value: "high_school", label: "High school", self: "High schooler", short: "HS" },
  { value: "juco", label: "JUCO", self: "JUCO player", short: "JUCO" },
  {
    value: "four_year",
    label: "Four-year transfer",
    self: "Four-year college (NCAA/NAIA)",
    short: "4-yr",
  },
];

export const PLAYER_LEVEL_SHORT: Record<string, string> = Object.fromEntries(
  PLAYER_LEVELS.map((l) => [l.value, l.short])
);

// Pitcher role — the kind of arm a coach needs. Stored as keywords in a
// need's must_have bag alongside pitches and traits.
export const PITCHER_ROLES = ["Starter", "Reliever", "Closer", "Long relief"] as const;

// Preset "trait" chips the coach can tap instead of typing must-haves. They're
// position-aware; anything not in these presets is a custom, coach-typed trait.
export const PITCHER_TRAITS = [
  "Strike thrower",
  "Plus velocity",
  "Command",
  "Durability",
  "Good pickoff",
  "Sharp breaking ball",
  "Competitor",
  "Projectable frame",
] as const;

export const CATCHER_TRAITS = [
  "Framing",
  "Blocking",
  "Strong arm",
  "Game-caller",
  "Power bat",
  "Leader",
] as const;

export const HITTER_TRAITS = [
  "Power",
  "Pure hitter",
  "Speed",
  "Plate discipline",
  "Defense",
  "Strong arm",
  "Versatile",
  "Competitor",
] as const;

// Everything the wizard recognizes as a structured chip (so an edited need can
// be split back out of must_have into pitches / roles / traits / custom).
export const KNOWN_PITCHER_ROLES = new Set<string>(PITCHER_ROLES);
export const KNOWN_TRAITS = new Set<string>([
  ...PITCHER_TRAITS,
  ...CATCHER_TRAITS,
  ...HITTER_TRAITS,
]);

export function isPitcher(position: string | null | undefined): boolean {
  return !!position && (PITCHER_POSITIONS as readonly string[]).includes(position);
}
export function isCatcher(position: string | null | undefined): boolean {
  return position === "C";
}
export function isOutfielder(position: string | null | undefined): boolean {
  return !!position && (OUTFIELD_POSITIONS as readonly string[]).includes(position);
}
