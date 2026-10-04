import { cn } from "@/lib/cn";
import { formatHeight } from "@/lib/format";
import type { Player } from "@/lib/types";

type StatTile = {
  value: string;
  unit?: string;
  label: string;
  tone: "accent" | "gold";
};

/**
 * Recruiting-card stat block: a structured vitals row (HT/WT/Bats/Throws)
 * above a grid of position-aware headline metric tiles + GPA.
 * Shared by the player's own profile and the coach's applicant sheet so the
 * two views stay in lockstep.
 */
export function StatBlock({
  player,
  className,
}: {
  player: Player;
  className?: string;
}) {
  const height = formatHeight(player.height_in);

  const metricTiles: StatTile[] = [];
  const add = (v: number | null, label: string, unit?: string) => {
    if (v != null)
      metricTiles.push({ value: String(v), unit, label, tone: "accent" });
  };
  add(player.fastball_velo, "FB velo", "mph");
  add(player.pop_time, "Pop time", "sec");
  add(player.exit_velo, "Exit velo", "mph");
  add(player.sixty_yd, "60 yard", "sec");
  add(player.inf_velo, "INF velo", "mph");
  add(player.of_velo, "OF velo", "mph");
  const tiles: StatTile[] = metricTiles.slice(0, 3);
  if (player.gpa != null)
    tiles.push({
      value: player.gpa.toFixed(2),
      unit: player.gpa <= 4 ? "/ 4.0" : undefined,
      label: "GPA",
      tone: "gold",
    });
  const cols = tiles.length >= 4 ? 2 : Math.max(tiles.length, 1);

  const vitals = [
    height ? { label: "Height", value: height } : null,
    player.weight_lb ? { label: "Weight", value: `${player.weight_lb}` } : null,
    player.bats ? { label: "Bats", value: player.bats } : null,
    player.throws ? { label: "Throws", value: player.throws } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  if (tiles.length === 0 && vitals.length === 0) return null;

  return (
    <div className={className}>
      {/* Vitals — structured stat row */}
      {vitals.length > 0 && (
        <div
          className="grid divide-x divide-divider overflow-hidden rounded-card border border-border bg-surface"
          style={{
            gridTemplateColumns: `repeat(${vitals.length}, minmax(0, 1fr))`,
          }}
        >
          {vitals.map((v) => (
            <div key={v.label} className="px-2 py-3 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-eyebrow text-muted-2">
                {v.label}
              </div>
              <div className="mt-1 font-display text-base font-bold text-ink">
                {v.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Headline metric tiles */}
      {tiles.length > 0 && (
        <div
          className={cn("grid gap-2.5", vitals.length > 0 && "mt-3")}
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {tiles.map((t) => {
            const gold = t.tone === "gold";
            return (
              <div
                key={t.label}
                className={cn(
                  "relative overflow-hidden rounded-card border border-border p-4 shadow-card",
                  gold
                    ? "bg-gradient-to-br from-surface to-warm-soft/60"
                    : "bg-gradient-to-br from-surface to-accent-soft/60"
                )}
              >
                <span
                  className={cn(
                    "absolute inset-y-3 left-0 w-1 rounded-r-pill",
                    gold ? "bg-gold" : "bg-accent"
                  )}
                  aria-hidden
                />
                <div className="pl-2.5">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-[30px] font-bold leading-none text-ink tabular-nums">
                      {t.value}
                    </span>
                    {t.unit && (
                      <span className="text-sm font-semibold text-muted-2">
                        {t.unit}
                      </span>
                    )}
                  </div>
                  <div
                    className={cn(
                      "mt-2 text-[10px] font-bold uppercase tracking-eyebrow",
                      gold ? "text-warm-text" : "text-accent"
                    )}
                  >
                    {t.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
