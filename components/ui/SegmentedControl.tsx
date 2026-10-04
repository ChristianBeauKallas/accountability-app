"use client";

import { cn } from "@/lib/cn";

type Segment<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex gap-1 p-1 bg-track rounded-seg",
        className
      )}
    >
      {segments.map((seg) => {
        const active = seg.value === value;
        return (
          <button
            key={seg.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(seg.value)}
            className={cn(
              "flex-1 h-9 rounded-seg-in text-sm font-sans font-semibold transition-colors",
              active
                ? "bg-surface text-ink shadow-seg"
                : "text-muted hover:text-ink"
            )}
          >
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}
