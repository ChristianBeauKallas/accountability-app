"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { BaseballIcon } from "@/components/ui/BaseballIcon";
import { createClient } from "@/lib/supabase/client";
import { FitCard, type FeedItem } from "@/components/player/FitCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { Player } from "@/lib/types";

type Filter = "all" | "close" | "top";

export function FitsFeed({
  userId,
  player,
  items,
  followedIds = [],
}: {
  userId: string;
  player: Player;
  items: FeedItem[];
  followedIds?: string[];
}) {
  const supabase = createClient();
  const followedSet = new Set(followedIds);
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

  const unapplied = items.filter((i) => !appliedIds.has(i.need.id));
  const visible = unapplied.filter((i) => (filter === "top" ? i.fit >= 75 : true));

  const allCount = unapplied.length;
  const appliedCount = appliedIds.size;

  return (
    <div className="space-y-4">
      {items.length > 1 && (
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          segments={[
            { value: "all", label: `All fits (${allCount})` },
            { value: "top", label: "Best Fits (75%+)" },
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
                saved={followedSet.has(item.need.program.id)}
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
          <BaseballIcon size={24} strokeWidth={2} aria-hidden />
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
            : "Schools we feel are a good fit will show up here."}
      </p>
    </div>
  );
}
