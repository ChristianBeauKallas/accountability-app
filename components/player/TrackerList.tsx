"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Avatar } from "@/components/ui/Avatar";
import { SaveButton } from "@/components/SaveButton";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { STATUS_LABEL, STATUS_TONE, timeAgo } from "@/lib/format";
import type { Application, Need, Program } from "@/lib/types";

export type TrackerRow = Application & {
  need: (Need & { program: Program }) | null;
};

type Filter = "mine" | "mutual" | "closed";

export function TrackerList({
  rows,
  followed,
  userId,
}: {
  rows: TrackerRow[];
  followed: Program[];
  userId: string;
}) {
  const [filter, setFilter] = useState<Filter>("mine");
  const followedSet = new Set(followed.map((p) => p.id));

  const visible = rows.filter((r) => {
    if (filter === "mine") return r.status === "new" || r.status === "viewed";
    if (filter === "mutual") return r.status === "interested";
    return r.status === "closed";
  });

  const mutualCount = rows.filter((r) => r.status === "interested").length;

  const emptyCopy =
    filter === "mutual"
      ? "When a coach marks interest back, it'll show up here."
      : filter === "closed"
        ? "Spots a coach passed on land here. It happens — keep going."
        : "Head to Recommended Fits and show interest in a few spots.";

  return (
    <div className="space-y-4">
      <SegmentedControl
        value={filter}
        onChange={setFilter}
        segments={[
          { value: "mine", label: "Interested" },
          {
            value: "mutual",
            label: mutualCount ? `Mutual (${mutualCount})` : "Mutual",
          },
          { value: "closed", label: "Closed" },
        ]}
      />

      {visible.length === 0 ? (
        <div className="rounded-card border border-dashed border-border bg-surface px-6 py-12 text-center">
          <p className="font-display text-lg font-semibold text-ink">
            Nothing here yet
          </p>
          <p className="mt-1 text-sm text-body-2">{emptyCopy}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((row) => (
            <li key={row.id}>
              <TrackerCard
                row={row}
                userId={userId}
                saved={
                  row.need?.program
                    ? followedSet.has(row.need.program.id)
                    : false
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


function TrackerCard({
  row,
  userId,
  saved,
}: {
  row: TrackerRow;
  userId: string;
  saved: boolean;
}) {
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
        <div className="flex shrink-0 flex-col items-end gap-1">
          {program && (
            <SaveButton programId={program.id} playerId={userId} initial={saved} />
          )}
          {row.fit_score != null && (
            <div className="text-right">
              <span className="font-display text-lg font-bold tabular-nums text-accent">
                {row.fit_score}
              </span>
              <p className="text-[10px] uppercase tracking-eyebrow text-muted-2">
                fit
              </p>
            </div>
          )}
        </div>
      </div>
      {interested && (
        <p className="mt-3 rounded-input bg-warm-soft px-3 py-2 text-sm font-medium text-warm-text">
          This coach is interested — you&rsquo;re on their radar.
        </p>
      )}
    </Card>
  );
}
