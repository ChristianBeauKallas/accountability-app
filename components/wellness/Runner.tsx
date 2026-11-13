import { cn } from "@/lib/cn";

// Clean mid-stride runner (the brand mark). Uses currentColor so it inherits
// the tile's text color.
export function RunnerIcon({
  size = 24,
  strokeWidth = 2,
  className,
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="13" cy="4" r="1" />
      <path d="M4 17l5 1l.75 -1.5" />
      <path d="M15 21l0 -4l-4 -3l1 -6" />
      <path d="M7 12l0 -3l5 -1l3 3l3 1" />
    </svg>
  );
}

// Gradient tile holding the runner. `bob` floats it gently.
export function RunnerMark({
  tile = 80,
  icon = 40,
  radius = 24,
  bob = false,
  halo = false,
  className,
}: {
  tile?: number;
  icon?: number;
  radius?: number;
  bob?: boolean;
  halo?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-grid place-items-center text-white",
        "bg-gradient-to-br from-accent to-accent-dark",
        bob && "animate-bob",
        className,
      )}
      style={{
        width: tile,
        height: tile,
        borderRadius: radius,
        boxShadow: halo
          ? "0 16px 42px rgb(var(--c-accent) / 0.34), 0 0 0 8px rgb(var(--c-accent-soft))"
          : "0 10px 30px rgba(0,0,0,0.35)",
      }}
    >
      <RunnerIcon size={icon} />
    </span>
  );
}
