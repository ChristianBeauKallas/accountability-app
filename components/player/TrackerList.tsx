"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Avatar } from "@/components/ui/Avatar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { STATUS_LABEL, STATUS_TONE, timeAgo } from "@/lib/format";
import type { Application, Need, Program } from "@/lib/types";

export type TrackerRow = Application & {
  need: (Need & { program: Program }) | null;
};

type Filter = "all" | "active" | "interested";

export function TrackerList({ rows }: { rows: TrackerRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const visible = rows.filter((r) => {
    if (filter === "active") return r.status === "new" || r.status === "viewed";
    if (filter === "interested") return r.status === "interested";
    return true;
  });

  const interestedCount = rows.filter((r) => r.status === "interested").length;

  return (
    <div className="space-y-4">
      <SegmentedControl
        value={filter}
        onChange={setFilter}
        segments={[
          { value: "all", label: "All" },
          { value: "active", label: "Active" },
          {
            value: "interested",
            label: interestedCount ? `★ ${interestedCount}` : "Interested",
          },
        ]}
      />

      {visible.length === 0 ? (
        <div className="rounded-card border border-dashed border-border bg-surface px-6 py-12 text-center">
          <p className="font-display text-lg font-semibold text-ink">
            Nothing here yet
          </p>
          <p className="mt-1 text-sm text-body-2">
            {filter === "interested"
              ? "When a coach marks interest, it'll show up here."
              : "Head to Fits and put your name in on a few spots."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((row) => (
            <li key={row.id}>
              <TrackerCard row={row} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TrackerCard({ row }: { row: TrackerRow }) {
  const program = row.need?.program;
  const interested = row.status === "interested";

  return (
    <Card padded className={interested ? "ring-1 ring-gold/60" : undefined}>
      <div className="flex items-start gap-3">
        <Link
          href={program ? `/programs/${program.id}` : "#"}
          className="flex min-w-0 flex-1 items-start gap-3"
        >
          <Avatar
            name={program?.name ?? "Program"}
            src={program?.logo_url}
            size={42}
          />
          <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-semibold leading-tight">
            {program?.name ?? "Program"}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
            <MapPin size={13} strokeWidth={2} aria-hidden />
            <span className="truncate">
              {program
                ? [program.city, program.state].filter(Boolean).join(", ")
                : "—"}
              {program?.division ? ` · ${program.division}` : ""}
            </span>
          </p>
          <p className="mt-1.5 truncate text-sm text-body-2">
            {row.need?.title ?? "Roster need"}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Chip tone={STATUS_TONE[row.status] as "status-new"} size="sm">
              {STATUS_LABEL[row.status]}
            </Chip>
            <span className="text-xs text-muted-2">
              In · {timeAgo(row.created_at)}
            </span>
          </div>
          </div>
        </Link>
        {row.fit_score != null && (
          <div className="shrink-0 text-right">
            <div className="flex items-center gap-0.5 text-accent">
              <Star size={13} strokeWidth={2} aria-hidden />
              <span className="font-display text-lg font-bold tabular-nums">
                {row.fit_score}
              </span>
            </div>
            <p className="text-[10px] uppercase tracking-eyebrow text-muted-2">
              fit
            </p>
          </div>
        )}
      </div>
      {interested && (
        <p className="mt-3 rounded-input bg-warm-soft px-3 py-2 text-sm font-medium text-warm-text">
          This coach is interested — you&rsquo;re on their radar.
        </p>
      )}
    </Card>
  );
}
