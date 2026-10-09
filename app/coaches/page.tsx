import type { Metadata } from "next";
import {
  ArrowRight,
  ClipboardList,
  Inbox,
  Star,
  MapPin,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { CoachWaitlistForm } from "@/components/marketing/CoachWaitlistForm";

export const metadata: Metadata = {
  title: "Athletx for Coaches — recruit to your roster needs",
  description:
    "Post the exact spots you're recruiting for. Players who fit show interest, ranked best-fit first. Built for D2, D3, NAIA and JUCO baseball. Join the coach test group.",
  openGraph: {
    title: "Athletx for Coaches — recruit to your roster needs",
    description:
      "Post what you need. The players who fit come to you, ranked best-fit first. Built for small-college baseball.",
    images: ["/marketing/og-twosided.png"],
  },
};

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-bold tracking-tight ${className}`}>
      athletx<span className="text-gold">.</span>
    </span>
  );
}

export default function CoachesLanding() {
  return (
    <div data-theme="dark" className="min-h-dvh bg-ground text-ink">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-divider/60 bg-ground/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Wordmark className="text-2xl" />
          <a
            href="#join"
            className="rounded-btn bg-accent px-4 py-2 text-sm font-semibold text-surface transition-colors hover:bg-accent-dark"
          >
            Request access
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-10%] h-[520px] w-[820px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(79,176,122,0.20) 0%, rgba(79,176,122,0) 60%)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="eyebrow text-accent">For college coaches</p>
            <h1 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              Recruit to your{" "}
              <span className="text-accent">roster needs</span> — not your inbox.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-body-2">
              Post the exact spots you&rsquo;re recruiting for. The players who
              actually fit show their interest — ranked best-fit first. No cold
              outreach, no sifting through the noise.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#join"
                className="inline-flex h-[54px] items-center gap-2 rounded-cta bg-accent px-6 text-base font-semibold text-surface transition-colors hover:bg-accent-dark"
              >
                Join the test group
                <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
              </a>
              <a
                href="#how"
                className="inline-flex h-[54px] items-center rounded-cta border border-border px-6 text-base font-semibold text-ink transition-colors hover:bg-surface"
              >
                See how it works
              </a>
            </div>
            <p className="mt-6 text-sm font-semibold uppercase tracking-eyebrow text-muted-2">
              Built for D2 · D3 · NAIA · JUCO
            </p>
          </div>

          <div className="flex justify-center md:justify-end">
            <PhoneFrame src="/marketing/coach-inbox.png" alt="Athletx coach inbox — interested players ranked by fit" />
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-t border-divider/60 bg-surface/40">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
          <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            Recruiting is backwards for small-college coaches.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-body-2">
            Your inbox fills with players who were never a fit. Meanwhile the
            player who&rsquo;d be perfect for your program is emailing D1 schools
            that never write back. The right fits are out there — you just
            can&rsquo;t find each other.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            <Stat n="100s" label="of generic emails to dig through" />
            <Stat n="0" label="way to filter for what you actually need" />
            <Stat n="The one" label="player who fits, lost in the pile" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
          <p className="eyebrow text-accent">How it works</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Post what you need. Meet the players who fit.
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <Step
              n="1"
              icon={<ClipboardList size={22} strokeWidth={2} aria-hidden />}
              title="Post a roster need"
              body="Pick the position, the metrics that matter, who qualifies (HS, JUCO, four-year transfer, grad year, GPA). We draft the post for you in seconds."
            />
            <Step
              n="2"
              icon={<Star size={22} strokeWidth={2} aria-hidden />}
              title="The right players raise their hand"
              body="Only players who actually fit even see your post. The ones who are interested tap once — and land in your inbox, ranked best-fit first."
            />
            <Step
              n="3"
              icon={<Inbox size={22} strokeWidth={2} aria-hidden />}
              title="You decide — one tap"
              body="See their measurables, video and profile. Mark interested or pass. When you're both in, you get their contact info. No cold outreach."
            />
          </div>
        </div>
      </section>

      {/* Two-sided feature */}
      <section className="border-y border-divider/60 bg-surface/40">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-20">
          <div className="order-2 flex justify-center md:order-1">
            <PhoneFrame src="/marketing/player-fits.png" alt="Athletx player fits feed — spots ranked by fit" />
          </div>
          <div className="order-1 md:order-2">
            <p className="eyebrow text-accent">Why it works</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              A fit score, both ways.
            </h2>
            <p className="mt-4 text-lg text-body-2">
              Every player sees exactly where they line up against your spot —
              position, metrics, academics, distance — so the players who show
              interest already know they fit. You get intent, not spray-and-pray.
            </p>
            <ul className="mt-8 space-y-4">
              <Feature icon={<Zap size={18} strokeWidth={2.5} aria-hidden />} title="Recruit by what you actually need">
                Pitcher with a role and a velo floor. A catcher who can throw.
                A bat with a grad year and a GPA. Set the bar; only players who
                clear it get through.
              </Feature>
              <Feature icon={<MapPin size={18} strokeWidth={2.5} aria-hidden />} title="Built for small-college reality">
                Distance, level and academics are baked into the fit — so you
                hear from players who can realistically come play for you.
              </Feature>
              <Feature icon={<ShieldCheck size={18} strokeWidth={2.5} aria-hidden />} title="Intent, not noise">
                Players come to you. Every one in your inbox chose your program.
              </Feature>
            </ul>
          </div>
        </div>
      </section>

      {/* Founder note */}
      <section>
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-20">
          <p className="eyebrow text-accent">Why I built this</p>
          <blockquote className="mt-4 space-y-4 text-lg leading-relaxed text-body-2">
            <p>
              I almost quit baseball when the school I picked wasn&rsquo;t the
              right fit. My coach lined me up with an NAIA program in the middle
              of nowhere, Kansas, that I&rsquo;d never heard of. Two years later
              I led the country in hits and made NAIA All-American.
            </p>
            <p>
              Then I coached small-college ball and saw the other side — an
              inbox full of players who weren&rsquo;t a fit, while the kid
              who&rsquo;d have been perfect was emailing D1 schools that never
              wrote back.
            </p>
            <p className="font-semibold text-ink">
              The right fit is out there for almost every player. They just
              can&rsquo;t find each other. That&rsquo;s what Athletx fixes.
            </p>
          </blockquote>
        </div>
      </section>

      {/* Join */}
      <section id="join" className="scroll-mt-20 border-t border-divider/60 bg-surface/40">
        <div className="mx-auto max-w-2xl px-6 py-16 md:py-24">
          <div className="text-center">
            <p className="eyebrow text-accent">Early access</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Join the coach test group
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-body-2">
              We&rsquo;re onboarding small-college coaches now, in waves. Tell us
              about your program and we&rsquo;ll get you in.
            </p>
          </div>
          <div className="mt-10 rounded-card border border-border bg-ground p-6 sm:p-8">
            <CoachWaitlistForm />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-divider/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <Wordmark className="text-xl" />
          <p className="text-sm text-muted-2">
            Athletx · College baseball, matched by fit.
          </p>
        </div>
      </footer>
    </div>
  );
}

function PhoneFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="w-[260px] rounded-[42px] bg-black p-2.5 shadow-[0_30px_70px_rgba(0,0,0,0.5)] sm:w-[300px]">
      <div className="overflow-hidden rounded-[34px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="block w-full" />
      </div>
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="rounded-card border border-border bg-ground p-5">
      <div className="font-display text-3xl font-bold text-accent">{n}</div>
      <p className="mt-1 text-sm text-body-2">{label}</p>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  body,
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="relative rounded-card border border-border bg-surface/60 p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-pill bg-accent-soft text-accent">
          {icon}
        </span>
        <span className="font-display text-2xl font-bold text-muted-2">{n}</span>
      </div>
      <h3 className="mt-4 text-xl font-bold tracking-tight">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-body-2">{body}</p>
    </div>
  );
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-accent-soft text-accent">
        {icon}
      </span>
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-[15px] leading-relaxed text-body-2">{children}</p>
      </div>
    </li>
  );
}
