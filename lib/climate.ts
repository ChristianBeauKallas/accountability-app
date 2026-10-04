// Rough climate buckets by US state, for the "location / weather" feed filter.
export const CLIMATES = [
  { value: "warm", label: "Warm" },
  { value: "mild", label: "Mild" },
  { value: "cold", label: "Cold" },
] as const;

export type Climate = (typeof CLIMATES)[number]["value"];

const STATE_CLIMATE: Record<string, Climate> = {
  AL: "warm", AK: "cold", AZ: "warm", AR: "mild", CA: "warm", CO: "cold",
  CT: "cold", DE: "mild", FL: "warm", GA: "warm", HI: "warm", ID: "cold",
  IL: "cold", IN: "cold", IA: "cold", KS: "mild", KY: "mild", LA: "warm",
  ME: "cold", MD: "mild", MA: "cold", MI: "cold", MN: "cold", MS: "warm",
  MO: "mild", MT: "cold", NE: "cold", NV: "warm", NH: "cold", NJ: "mild",
  NM: "warm", NY: "cold", NC: "mild", ND: "cold", OH: "cold", OK: "mild",
  OR: "mild", PA: "cold", RI: "cold", SC: "warm", SD: "cold", TN: "mild",
  TX: "warm", UT: "cold", VT: "cold", VA: "mild", WA: "mild", WV: "cold",
  WI: "cold", WY: "cold",
};

export function stateClimate(state: string | null | undefined): Climate | null {
  if (!state) return null;
  return STATE_CLIMATE[state.toUpperCase()] ?? null;
}
