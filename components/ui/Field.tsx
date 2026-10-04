import { cn } from "@/lib/cn";

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="block font-sans text-sm font-semibold text-ink"
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-2">{hint}</p>}
    </div>
  );
}

const control =
  "w-full h-11 px-3 rounded-input border border-border bg-surface text-[15px] " +
  "text-ink placeholder:text-muted-2 outline-none focus:border-accent " +
  "focus:ring-2 focus:ring-accent/20 transition-colors disabled:opacity-50";

export const Input = ({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn(control, className)} {...props} />
);

export const Select = ({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cn(control, "appearance-none pr-8", className)} {...props}>
    {children}
  </select>
);

export const Textarea = ({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={cn(
      control,
      "h-auto min-h-[88px] py-2.5 leading-relaxed",
      className
    )}
    {...props}
  />
);
