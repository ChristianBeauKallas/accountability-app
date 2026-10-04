"use client";

import { useState } from "react";
import { Compass, SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FitCard, type FeedItem } from "@/components/player/FitCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { Player } from "@/lib/types";

type Filter = "all" | "close" | "top";

export function FitsFeed({
  userId,
  player,
  items,
}: {
  userId: string;
  player: Player;
  items: FeedItem[];
}) {
  const supabase = createClient();
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  async function apply(item: FeedItem) {
    setError("");
    setApplyingId(item.need.id);
    const { error: err } = await supabase.from("applications").insert({
      need_id: item.need.id,
      player_id: userId,
      status: "new",
      fit_score: item.fit,
    });
    setApplyingId(null);
    if (err) {
      setError(err.message);
      return;
    }
    setAppliedIds((prev) => new Set(prev).add(item.need.id));
  }

  const visible = items
    .filter((i) => !appliedIds.has(i.need.id))
    .filter((i) => (filter === "top" ? i.fit >= 75 : true));

  const appliedCount = appliedIds.size;

  return (
    <div className="space-y-4">
      {items.length > 1 && (
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          segments={[
            { value: "all", label: "All fits" },
            { value: "top", label: "Top (75+)" },
          ]}
        />
      )}

      {error && (
        <p className="rounded-input bg-warm-soft px-3 py-2 text-sm text-warm-text">
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <EmptyState appliedCount={appliedCount} hadItems={items.length > 0} />
      ) : (
        <ul className="space-y-3.5">
          {visible.map((item) => (
            <li key={item.need.id}>
              <FitCard
                item={item}
                player={player}
                applying={applyingId === item.need.id}
                applied={appliedIds.has(item.need.id)}
                onApply={() => apply(item)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({
  appliedCount,
  hadItems,
}: {
  appliedCount: number;
  hadItems: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border bg-surface px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-pill bg-accent-soft text-accent">
        {appliedCount > 0 ? (
          <SlidersHorizontal size={22} strokeWidth={2} aria-hidden />
        ) : (
          <Compass size={22} strokeWidth={2} aria-hidden />
        )}
      </span>
      <p className="font-display text-lg font-semibold text-ink">
        {appliedCount > 0 ? "You're all caught up" : "No fits just yet"}
      </p>
      <p className="max-w-xs text-sm text-body-2">
        {appliedCount > 0
          ? "You're in for everything that fits right now. New spots show up the moment coaches post them."
          : hadItems
            ? "Try the “All fits” filter, or round out your profile so more spots turn up."
            : "When coaches post spots you fit, they'll show up here. A fuller profile surfaces more."}
      </p>
    </div>
  );
}
