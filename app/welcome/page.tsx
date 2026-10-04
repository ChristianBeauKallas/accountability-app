import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
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
      <p className="eyebrow">Athletx</p>
      <h1 className="mt-3 text-[40px] leading-[1.05] font-display font-bold tracking-tight text-ink">
        Helping ball players
        <br />
        find the right fit.
      </h1>
      <p className="mt-4 text-base text-body-2 max-w-[22rem]">
        Build your recruiting profile and let our algorithm do the matching.
      </p>

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
