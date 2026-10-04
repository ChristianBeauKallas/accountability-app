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

export function isPitcher(position: string | null | undefined): boolean {
  return !!position && (PITCHER_POSITIONS as readonly string[]).includes(position);
}
export function isCatcher(position: string | null | undefined): boolean {
  return position === "C";
}
export function isOutfielder(position: string | null | undefined): boolean {
  return !!position && (OUTFIELD_POSITIONS as readonly string[]).includes(position);
}
