import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ClipboardList, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BaseballIcon } from "@/components/ui/BaseballIcon";

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
      <div className="flex flex-1 flex-col justify-center py-10">
        <p className="font-sans text-[12px] font-semibold uppercase tracking-wordmark text-muted">
          College baseball recruiting
        </p>
        <h1 className="mt-3 text-[44px] leading-[1.02] font-display font-bold tracking-tight text-ink">
          Helping ball players find the right fit.
        </h1>
        <p className="mt-5 max-w-[22rem] text-[17px] leading-relaxed text-body-2">
          Build your recruiting profile and let our algorithm do the matching.
        </p>
      </div>

      {/* Role picker */}
      <div className="space-y-4">
        <p className="text-center text-sm text-muted">I&rsquo;m a&hellip;</p>
        <div className="grid grid-cols-2 gap-3">
          <RoleCard
            href="/login?role=player"
            title="Player"
            sub="HS or transfer"
            icon={BaseballIcon as unknown as LucideIcon}
          />
          <RoleCard
            href="/login?role=coach"
            title="Coach"
            sub="D2/D3/NAIA/JUCO"
            icon={ClipboardList}
          />
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
  icon: Icon,
}: {
  href: string;
  title: string;
  sub: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-card border border-border bg-surface p-5 shadow-card transition-transform active:scale-[0.99]"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-pill bg-accent-soft text-accent">
        <Icon size={22} strokeWidth={2} aria-hidden />
      </span>
      <h2 className="mt-4 font-display text-2xl font-bold text-ink">{title}</h2>
      <p className="text-sm text-muted">{sub}</p>
      <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-accent">
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
