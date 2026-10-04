import { cn } from "@/lib/cn";

// Pill-shaped chip used for filters, positions, metrics and statuses.
type Tone =
  | "neutral" // default chip
  | "accent" // position / primary tag
  | "metric" // metric readout
  | "selected" // active filter
  | "status-new"
  | "status-viewed"
  | "status-interested"
  | "status-closed";

type ChipProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
  size?: "sm" | "md";
};

const tones: Record<Tone, string> = {
  neutral: "bg-chip text-body-2",
  accent: "bg-accent-soft text-accent-dark",
  metric: "bg-chip text-ink font-semibold tabular-nums",
  selected: "bg-accent text-surface",
  "status-new": "bg-accent text-surface",
  "status-viewed": "bg-chip text-muted",
  "status-interested": "bg-warm-soft text-warm-text",
  "status-closed": "bg-track text-muted-2",
};

const sizes = {
  sm: "h-6 px-2 text-[11px]",
  md: "h-7 px-3 text-xs",
};

export function Chip({
  tone = "neutral",
  size = "md",
  className,
  children,
  ...props
}: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill font-sans font-medium whitespace-nowrap",
        tones[tone],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
