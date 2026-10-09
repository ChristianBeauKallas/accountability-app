import Link from "next/link";
import { ArrowRight, FlaskConical } from "lucide-react";

export const metadata = {
  title: "Athletx — QA",
  robots: { index: false, follow: false },
};

// Internal testing launchpad. Not linked from the public site — the real
// signup / onboarding flow lives here so the full process can be tested
// end to end while public account creation stays off the sales page.
export default function QaLaunchpad() {
  return (
    <main className="flex min-h-dvh flex-col px-6 pt-14 pb-10">
      <div className="font-display text-2xl font-bold tracking-tight">
        athletx<span className="text-gold">.</span>
      </div>

      <div className="mt-10">
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-eyebrow text-accent">
          <FlaskConical size={13} strokeWidth={2.5} aria-hidden />
          Internal QA
        </span>
        <h1 className="mt-3 text-3xl font-display font-bold tracking-tight">
          Test the full flow
        </h1>
        <p className="mt-1 text-[15px] text-body-2">
          Walk the real signup → onboarding → app process end to end. These
          entries aren&rsquo;t linked from the public site.
        </p>
      </div>

      <div className="mt-8 space-y-3">
        <QaLink
          href="/login?role=coach"
          title="New coach — sign up"
          sub="Create a coach account → program setup → inbox"
        />
        <QaLink
          href="/login?role=player"
          title="New player — sign up"
          sub="Create a player account → profile build → fits"
        />
        <QaLink href="/login" title="Sign in" sub="Log into an existing test account" />
        <QaLink href="/welcome" title="Role picker" sub="The standard entry screen" />
      </div>

      <p className="mt-auto pt-10 text-xs text-muted-2">
        Tip: lock this down for good by turning off “Allow new users to sign
        up” in Supabase → Authentication when testing wraps.
      </p>
    </main>
  );
}

function QaLink({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-4 transition-transform active:scale-[0.99]"
    >
      <div>
        <p className="font-display text-lg font-bold text-ink">{title}</p>
        <p className="mt-0.5 text-sm text-muted">{sub}</p>
      </div>
      <ArrowRight
        size={18}
        strokeWidth={2}
        className="shrink-0 text-accent transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}
