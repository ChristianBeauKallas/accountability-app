import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  full?: boolean;
};

const base =
  "inline-flex items-center justify-center gap-2 font-sans font-semibold " +
  "rounded-btn transition-colors select-none disabled:opacity-50 " +
  "disabled:pointer-events-none active:scale-[0.99]";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-surface hover:bg-accent-dark",
  secondary: "bg-surface text-ink border border-border hover:bg-chip",
  ghost: "bg-transparent text-accent hover:bg-accent-soft",
  danger: "bg-transparent text-danger hover:bg-warm-soft",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-4 text-[15px]",
  lg: "h-[52px] px-5 text-base rounded-cta",
};

export function Button({
  variant = "primary",
  size = "md",
  full = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        base,
        variants[variant],
        sizes[size],
        full && "w-full",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
