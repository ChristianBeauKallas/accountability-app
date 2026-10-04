import { Construction } from "lucide-react";

export function ScreenStub({
  eyebrow,
  title,
  phase,
  children,
}: {
  eyebrow: string;
  title: string;
  phase: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="px-5 pt-12">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-1 text-3xl font-display font-bold tracking-tight">
        {title}
      </h1>
      <div className="mt-8 flex flex-col items-center gap-3 rounded-card border border-dashed border-border bg-surface px-6 py-10 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-pill bg-chip text-muted">
          <Construction size={22} strokeWidth={2} aria-hidden />
        </span>
        <p className="font-display text-lg font-semibold text-ink">
          Coming in {phase}
        </p>
        <p className="max-w-xs text-sm text-body-2">
          The scaffolding is in place — this screen gets built next.
        </p>
      </div>
      {children}
    </main>
  );
}
