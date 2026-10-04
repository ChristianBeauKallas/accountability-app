import { cn } from "@/lib/cn";

// Linear progress — used for profile completeness, fit score bars, etc.
type LinearProps = {
  value: number; // 0-100
  className?: string;
  tone?: "accent" | "gold";
};

export function ProgressBar({ value, className, tone = "accent" }: LinearProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("h-2 w-full rounded-pill bg-track overflow-hidden", className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-pill transition-[width] duration-500",
          tone === "accent" ? "bg-accent" : "bg-gold"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// Segmented progress — used for multi-step onboarding.
type SegmentedProps = {
  total: number;
  current: number; // 1-based index of active step
  className?: string;
};

export function StepProgress({ total, current, className }: SegmentedProps) {
  return (
    <div className={cn("flex gap-1.5", className)} aria-label={`Step ${current} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-pill transition-colors",
            i < current ? "bg-accent" : "bg-track"
          )}
        />
      ))}
    </div>
  );
}
