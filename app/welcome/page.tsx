import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function WelcomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <main className="min-h-dvh bg-ground text-ink flex flex-col px-6 pt-14 pb-10">
      {/* Wordmark */}
      <div className="font-display text-2xl font-bold tracking-tight text-ink">
        athletx<span className="text-gold">.</span>
      </div>

      {/* Hero */}
      <div className="mt-14">
        <h1 className="text-[44px] leading-[1.02] font-display font-bold tracking-tight text-ink">
          Helping ball players find the right fit.
        </h1>
        <p className="mt-5 max-w-[22rem] text-[17px] leading-relaxed text-body-2">
          Build your recruiting profile and let our algorithm take care of the
          rest.
        </p>
      </div>

      {/* Role picker */}
      <div className="mt-12 space-y-4">
        <p className="text-center text-sm text-muted">I&rsquo;m a&hellip;</p>
        <div className="grid grid-cols-2 gap-3">
          <RoleCard href="/login?role=player" title="Player" sub="HS or transfer" />
          <RoleCard href="/login?role=coach" title="Coach" sub="D2/D3/NAIA/JUCO" />
        </div>
        <p className="pt-1 text-center text-sm text-body-2">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-gold">
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
      className="group flex flex-col rounded-card border border-border bg-surface p-5 shadow-card transition-transform active:scale-[0.99]"
    >
      <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
      <p className="text-sm text-muted">{sub}</p>
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
