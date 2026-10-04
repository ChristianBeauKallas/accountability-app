import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Target, Zap, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function WelcomePage() {
  // If already signed in, bounce to the router.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <main className="min-h-dvh flex flex-col px-6 pt-16 pb-10">
      {/* Brand */}
      <div className="flex-1">
        <p className="eyebrow">Athletx</p>
        <h1 className="mt-3 text-[40px] leading-[1.05] font-display font-bold tracking-tight text-ink">
          Real roster spots.
          <br />
          Real fits.
        </h1>
        <p className="mt-4 text-base text-body-2 max-w-[22rem]">
          Coaches post the spots they&rsquo;re actually recruiting. Players see
          only where they fit — and apply in one tap. No spam. No ghosting.
        </p>

        {/* How it works teaser */}
        <ul className="mt-8 space-y-4">
          {[
            {
              icon: Target,
              text: "See roster needs you actually match — ranked by fit.",
            },
            { icon: Zap, text: "Apply in one tap. Coaches get a clean inbox." },
            {
              icon: ShieldCheck,
              text: "Nobody browses players. You reach out — not the other way.",
            },
          ].map(({ icon: Icon, text }, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-accent-soft text-accent">
                <Icon size={18} strokeWidth={2} aria-hidden />
              </span>
              <span className="text-[15px] text-body-2">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Role picker */}
      <div className="mt-10 space-y-3">
        <p className="text-center text-sm text-muted">I&rsquo;m a&hellip;</p>
        <div className="grid grid-cols-2 gap-3">
          <RoleCard
            href="/login?role=player"
            title="Player"
            sub="HS or transfer"
          />
          <RoleCard href="/login?role=coach" title="Coach" sub="D2/D3/NAIA/JUCO" />
        </div>
        <p className="pt-2 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-accent">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

function RoleCard({
  href,
  title,
  sub,
}: {
  href: string;
  title: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col justify-between rounded-card border border-border bg-surface p-4 shadow-card transition-colors hover:border-accent"
    >
      <div>
        <h2 className="text-2xl font-display font-bold text-ink">{title}</h2>
        <p className="text-sm text-muted">{sub}</p>
      </div>
      <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-accent">
        Continue
        <ArrowRight
          size={16}
          strokeWidth={2}
          className="transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </Link>
  );
}
