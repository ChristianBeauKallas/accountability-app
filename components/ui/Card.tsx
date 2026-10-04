import { cn } from "@/lib/cn";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  as?: "div" | "article" | "section";
  padded?: boolean;
  interactive?: boolean;
};

export function Card({
  as: Tag = "div",
  padded = true,
  interactive = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <Tag
      className={cn(
        "bg-surface rounded-card border border-border shadow-card",
        padded && "p-4",
        interactive &&
          "transition-colors hover:border-muted-2/40 active:scale-[0.998] cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
