import { cn } from "@/lib/cn";
import { formatHeight } from "@/lib/format";
import type { Player } from "@/lib/types";

export type Metric = {
  value: string;
  unit?: string;
  label: string;
  tone?: "accent" | "gold";
};

export type RowItem = { label: string; value: string };

/**
 * A grid of headline metric tiles — big display number + unit, with a
 * color-coded accent bar and a subtle gradient. Shared across the player
 * profile, coach applicant sheet, and program page so they stay identical.
 */
export function MetricTiles({
  tiles,
  className,
}: {
  tiles: Metric[];
  className?: string;
}) {
  if (tiles.length === 0) return null;
  const cols = tiles.length >= 4 ? 2 : Math.max(tiles.length, 1);
  return (
    <div
      className={cn("grid gap-2.5", className)}
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
  );
}

/**
 * A single bordered row split into evenly-divided cells, each a small
 * uppercase label over a bold value. Used for physical vitals and for a
 * program's descriptive details.
 */
export function StatRow({
  items,
  className,
}: {
  items: RowItem[];
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div
      className={cn(
        "grid divide-x divide-divider overflow-hidden rounded-card border border-border bg-surface",
        className
      )}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((v) => (
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
  );
}

/**
 * Recruiting-card stat block for a player: a structured vitals row
 * (HT/WT/Bats/Throws) above a grid of position-aware headline metric tiles
 * + GPA.
 */
export function StatBlock({
  player,
  className,
}: {
  player: Player;
  className?: string;
}) {
  const height = formatHeight(player.height_in);

  const metricTiles: Metric[] = [];
  const add = (v: number | null, label: string, unit?: string) => {
    if (v != null)
      metricTiles.push({ value: String(v), unit, label, tone: "accent" });
  };
  add(player.fastball_velo, "FB velo", "mph");
  add(player.spin_rate, "Spin", "rpm");
  if (player.era != null)
    metricTiles.push({ value: player.era.toFixed(2), label: "ERA", tone: "accent" });
  add(player.pop_time, "Pop time", "sec");
  add(player.exit_velo, "Exit velo", "mph");
  if (player.batting_avg != null)
    metricTiles.push({
      value: player.batting_avg.toFixed(3).replace(/^0\./, "."),
      label: "Batting avg",
      tone: "accent",
    });
  add(player.sixty_yd, "60 yard", "sec");
  add(player.inf_velo, "INF velo", "mph");
  add(player.of_velo, "OF velo", "mph");
  const tiles: Metric[] = metricTiles.slice(0, 3);
  if (player.gpa != null)
    tiles.push({
      value: player.gpa.toFixed(2),
      unit: player.gpa <= 4 ? "/ 4.0" : undefined,
      label: "GPA",
      tone: "gold",
    });

  const vitals: RowItem[] = [
    height ? { label: "Height", value: height } : null,
    player.weight_lb ? { label: "Weight", value: `${player.weight_lb}` } : null,
    player.bats ? { label: "Bats", value: player.bats } : null,
    player.throws ? { label: "Throws", value: player.throws } : null,
  ].filter(Boolean) as RowItem[];

  if (tiles.length === 0 && vitals.length === 0) return null;

  return (
    <div className={className}>
      <StatRow items={vitals} />
      <MetricTiles tiles={tiles} className={vitals.length > 0 ? "mt-3" : ""} />
    </div>
  );
}
