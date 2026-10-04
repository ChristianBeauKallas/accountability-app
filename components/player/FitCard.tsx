import { MapPin, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { distanceMiles } from "@/lib/fit";
import { formatMiles, poolLabel } from "@/lib/format";
import type { Need, Player, Program } from "@/lib/types";

export type FeedItem = {
  need: Need & { program: Program };
  fit: number;
};

export function FitCard({
  item,
  player,
  onApply,
  applying,
  applied,
}: {
  item: FeedItem;
  player: Player;
  onApply: () => void;
  applying: boolean;
  applied: boolean;
}) {
  const { need } = item;
  const program = need.program;
  const matched = (player.positions ?? []).filter((p) =>
    need.positions.includes(p)
  );
  const miles = formatMiles(distanceMiles(player, program));

  return (
    <Card className="space-y-3.5">
      <div className="flex items-start gap-3">
        <Avatar name={program.name} src={program.logo_url} size={46} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-display font-semibold leading-tight">
            {program.name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
            <MapPin size={14} strokeWidth={2} aria-hidden />
            <span className="truncate">
              {[program.city, program.state].filter(Boolean).join(", ")}
              {miles ? ` · ${miles}` : ""}
            </span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-[26px] font-bold leading-none text-accent tabular-nums">
            {item.fit}
          </div>
          <p className="mt-0.5 text-[10px] uppercase tracking-eyebrow text-muted-2">
            fit
          </p>
        </div>
      </div>

      <div>
        <p className="eyebrow">
          {program.division}
          {program.conference ? ` · ${program.conference}` : ""}
        </p>
        <p className="mt-1 text-[15px] font-semibold text-ink">{need.title}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {matched.map((p) => (
          <Chip key={p} tone="accent">
            {p}
          </Chip>
        ))}
        <Chip>
          {poolLabel(
            need.grad_year_min,
            need.grad_year_max,
            need.accepts_transfer
          )}
        </Chip>
        {need.min_gpa > 0 && <Chip tone="metric">GPA {need.min_gpa}+</Chip>}
        {need.min_exit_velo != null && (
          <Chip tone="metric">EV {need.min_exit_velo}+</Chip>
        )}
        {need.min_fastball_velo != null && (
          <Chip tone="metric">FB {need.min_fastball_velo}+</Chip>
        )}
        {need.min_sixty != null && (
          <Chip tone="metric">60 ≤ {need.min_sixty}</Chip>
        )}
        {need.min_pop_time != null && (
          <Chip tone="metric">POP ≤ {need.min_pop_time}</Chip>
        )}
      </div>

      {need.must_have.length > 0 && (
        <p className="text-sm text-body-2">
          <span className="font-semibold text-ink">Wants: </span>
          {need.must_have.join(", ")}
        </p>
      )}

      <Button full onClick={onApply} disabled={applying || applied}>
        {applied ? (
          <>
            <Check size={18} strokeWidth={2.5} aria-hidden />
            You&rsquo;re in
          </>
        ) : applying ? (
          "Putting you in…"
        ) : (
          "Put me in"
        )}
      </Button>
    </Card>
  );
}
