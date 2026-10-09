import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  ClipboardList,
  Inbox,
  Star,
  MapPin,
  ShieldCheck,
  Zap,
  UserCircle,
  Compass,
  Hand,
  BellRing,
} from "lucide-react";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";
import { BaseballIcon } from "@/components/ui/BaseballIcon";

type Audience = "both" | "coach" | "player" | "parent";
type PageAudience = "coach" | "player" | "parent";

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-bold tracking-tight ${className}`}>
      athletx<span className="text-gold">.</span>
    </span>
  );
}

/**
 * Public sales page. Rendered at the root (audience="both") and on the
 * audience-specific pages /coaches and /players. The real login / onboarding
 * flow is kept off this page.
 */
export function SalesPage({ audience = "both" }: { audience?: Audience }) {
  return (
    <div data-theme="dark" className="min-h-dvh bg-ground text-ink">
      <Nav audience={audience} />
      {audience === "both" ? (
        <>
          <BothHero />
          <SplitSection />
          <Founder />
          <PickYourSide />
        </>
      ) : (
        <>
          <AudienceHero audience={audience} />
          <Problem audience={audience} />
          <ShowcaseSection audience={audience} />
          <HowItWorks audience={audience} />
          <ValueSection audience={audience} />
          {audience === "player" && <ParentLink />}
          <Founder />
          <JoinSection audience={audience} />
        </>
      )}
      <Footer />
    </div>
  );
}

/* ----------------------------- shared chrome ---------------------------- */

function Nav({ audience }: { audience: Audience }) {
  return (
    <header className="sticky top-0 z-30 border-b border-divider/60 bg-ground/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/">
          <Wordmark className="text-2xl" />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/coaches" className={navLink(audience === "coach")}>
            For coaches
          </Link>
          <Link href="/players" className={navLink(audience === "player")}>
            For players
          </Link>
          <Link href="/parents" className={navLink(audience === "parent")}>
            For parents
          </Link>
          <a
            href={audience === "both" ? "#pick" : "#join"}
            className="ml-1 rounded-btn bg-accent px-4 py-2 text-sm font-semibold text-surface transition-colors hover:bg-accent-dark"
          >
            Join the waitlist
          </a>
        </nav>
      </div>
    </header>
  );
}

function navLink(active: boolean) {
  return `hidden rounded-btn px-3 py-2 text-sm font-semibold transition-colors sm:inline-block ${
    active ? "text-accent" : "text-body-2 hover:text-ink"
  }`;
}

function Glow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-[-10%] h-[520px] w-[820px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
      style={{
        background:
          "radial-gradient(circle, rgba(79,176,122,0.20) 0%, rgba(79,176,122,0) 60%)",
      }}
    />
  );
}

function Founder() {
  return (
    <section>
      <div className="mx-auto max-w-3xl px-6 py-16 md:py-20">
        <p className="eyebrow text-accent">Why I built this</p>
        <blockquote className="mt-4 space-y-4 text-lg leading-relaxed text-body-2">
          <p>
            I almost quit baseball when the school I chose out of high school
            wasn&rsquo;t the right fit. My coach lined me up with an NAIA program
            in the middle of nowhere, Kansas, that I&rsquo;d never heard of. Two
            years later I led the country in hits, played in the NAIA World
            Series and was an NAIA All-American. I just needed the right fit.
          </p>
          <p>
            Then I coached small-college ball and saw the other side — an inbox
            full of players who weren&rsquo;t the right fit, while the kid
            who&rsquo;d have been perfect was emailing NCAA schools that never
            wrote back.
          </p>
          <p className="font-semibold text-ink">
            The right fit is out there for almost every player and program. They
            just can&rsquo;t find each other.
          </p>
          <p className="font-semibold text-ink">That&rsquo;s what Athletx serves to fix.</p>
        </blockquote>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-divider/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <Wordmark className="text-xl" />
        <div className="flex items-center gap-5 text-sm text-muted-2">
          <Link href="/coaches" className="hover:text-ink">
            For coaches
          </Link>
          <Link href="/players" className="hover:text-ink">
            For players
          </Link>
          <Link href="/parents" className="hover:text-ink">
            For parents
          </Link>
        </div>
        <p className="text-sm text-muted-2">College baseball, matched by fit.</p>
      </div>
    </footer>
  );
}

function PhoneFrame({
  src,
  alt,
  compact = false,
}: {
  src: string;
  alt: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-[38px] bg-black p-2 shadow-[0_30px_70px_rgba(0,0,0,0.5)] ${
        compact ? "w-[220px] md:w-[172px]" : "w-[240px] p-2.5 sm:w-[280px]"
      }`}
    >
      <div className="overflow-hidden rounded-[32px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="block w-full" />
      </div>
    </div>
  );
}

/* ------------------------------- root (both) ---------------------------- */

function BothHero() {
  return (
    <section className="relative overflow-hidden">
      <Glow />
      <div className="relative mx-auto max-w-3xl px-6 py-20 text-center md:py-28">
        <p className="eyebrow text-accent">College baseball, matched by fit</p>
        <h1 className="mx-auto mt-3 max-w-2xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
          The right fit is out there. We help you{" "}
          <span className="text-accent">find each other.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-body-2">
          Athletx connects small-college coaches with the high school and
          transfer players who fit their roster needs — ranked by fit, driven by
          the players.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/coaches"
            className="inline-flex h-[54px] items-center gap-2 rounded-cta bg-accent px-6 text-base font-semibold text-surface transition-colors hover:bg-accent-dark"
          >
            I&rsquo;m a coach
            <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
          </Link>
          <Link
            href="/players"
            className="inline-flex h-[54px] items-center gap-2 rounded-cta border border-border px-6 text-base font-semibold text-ink transition-colors hover:bg-surface"
          >
            I&rsquo;m a player
            <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
          </Link>
          <Link
            href="/parents"
            className="inline-flex h-[54px] items-center gap-2 rounded-cta border border-border px-6 text-base font-semibold text-ink transition-colors hover:bg-surface"
          >
            I&rsquo;m a parent
            <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}

function SplitSection() {
  return (
    <section id="pick" className="scroll-mt-20 border-t border-divider/60 bg-surface/40">
      <div className="mx-auto grid max-w-6xl gap-5 px-6 py-10 md:grid-cols-3 md:py-14">
        <SideCard
          href="/coaches"
          eyebrow="For coaches"
          phone={{ src: "/marketing/coach-inbox.png", alt: "Coach inbox ranked by fit" }}
          title="Recruit to your roster needs"
          points={[
            "Post the roster spots you actually need to fill — position, metrics, academics and the type of player you're looking for.",
            "Only players who fit see it. The interested ones land in your inbox.",
            "Ranked best-fit first. You show interest with one tap.",
          ]}
          cta="How it works for coaches"
        />
        <SideCard
          href="/players"
          eyebrow="For players"
          phone={{ src: "/marketing/player-fits.png", alt: "Player fits feed ranked by fit" }}
          title="Get recruited by the right schools"
          points={[
            "Build your player profile — bio, metrics, video, academics and the type of program you want to play for.",
            "See every spot that fits your profile, ranked by how well you fit it.",
            "Show interest with one tap.",
          ]}
          cta="How it works for players"
        />
        <SideCard
          href="/parents"
          eyebrow="For parents"
          phone={{
            src: "/marketing/player-profile.png",
            alt: "A fully built player profile on Athletx",
          }}
          title="Make the money and miles count"
          points={[
            "Stop guessing which showcase to pay for — reach the right programs directly.",
            "Hear from programs that are actually interested in your player.",
            "Full visibility and control over the recruiting process.",
          ]}
          cta="How it works for parents"
        />
      </div>
    </section>
  );
}

function SideCard({
  href,
  eyebrow,
  phone,
  title,
  points,
  cta,
}: {
  href: string;
  eyebrow: string;
  phone: { src: string; alt: string };
  title: string;
  points: string[];
  cta: string;
}) {
  return (
    <div className="flex flex-col rounded-card border border-border bg-ground p-5 sm:p-6">
      <p className="eyebrow text-accent">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight">{title}</h2>
      <div className="mt-5 flex justify-center">
        <PhoneFrame src={phone.src} alt={phone.alt} compact />
      </div>
      <ul className="mt-5 flex-1 space-y-2.5">
        {points.map((p) => (
          <li key={p} className="flex gap-2.5 text-sm leading-relaxed text-body-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill bg-accent-soft text-accent">
              <BaseballIcon size={12} strokeWidth={2} aria-hidden />
            </span>
            {p}
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className="mt-5 flex h-[50px] w-full items-center justify-center gap-2 rounded-cta bg-accent px-6 text-[15px] font-semibold text-surface transition-colors hover:bg-accent-dark"
      >
        {cta}
        <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
      </Link>
    </div>
  );
}

function PickYourSide() {
  return (
    <section id="pick-bottom" className="border-t border-divider/60 bg-surface/40">
      <div className="mx-auto max-w-3xl px-6 py-16 text-center md:py-20">
        <p className="eyebrow text-accent">Early access</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Join the waitlist
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-body-2">
          We&rsquo;re onboarding in small waves. Pick your side — a member of our
          team will reach out personally to get you set up.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/coaches#join"
            className="inline-flex h-[54px] items-center gap-2 rounded-cta bg-accent px-6 text-base font-semibold text-surface transition-colors hover:bg-accent-dark"
          >
            I&rsquo;m a coach
            <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
          </Link>
          <Link
            href="/players#join"
            className="inline-flex h-[54px] items-center gap-2 rounded-cta border border-border px-6 text-base font-semibold text-ink transition-colors hover:bg-surface"
          >
            I&rsquo;m a player
            <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
          </Link>
          <Link
            href="/parents#join"
            className="inline-flex h-[54px] items-center gap-2 rounded-cta border border-border px-6 text-base font-semibold text-ink transition-colors hover:bg-surface"
          >
            I&rsquo;m a parent
            <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* --------------------------- audience content --------------------------- */

const CONTENT = {
  coach: {
    eyebrow: "For college coaches",
    headline: (
      <>
        Recruit to your <span className="text-accent">roster needs</span> — not
        your inbox.
      </>
    ),
    sub: "Post the exact spots you're recruiting for. The players who actually fit show their interest — ranked best-fit first. No cold outreach, no sifting through the noise.",
    tagline: "Built for D2 · D3 · NAIA · JUCO",
    phone: {
      src: "/marketing/coach-inbox.png",
      alt: "Athletx coach inbox — interested players ranked by fit",
    },
    problemHeading: "Recruiting is backwards for small-college coaches.",
    problemBody:
      "Your inbox fills with players who were never a fit. Meanwhile the player who'd be perfect for your program is emailing D1 schools that never write back. The right fits are out there — you just can't find each other.",
    stats: [
      { n: "100s", label: "of generic emails to dig through" },
      { n: "0", label: "way to filter for what you actually need" },
      { n: "The one", label: "player who fits, lost in the pile" },
    ],
    howHeading: "Post what you need. Meet the players who fit.",
    steps: [
      {
        icon: "clipboard",
        title: "Post a roster need",
        body: "Pick the position, the metrics that matter, who qualifies (HS, JUCO, four-year transfer, grad year, GPA). We draft the post for you in seconds.",
      },
      {
        icon: "star",
        title: "The right players raise their hand",
        body: "Only players who actually fit even see your post. The ones who are interested tap once — and land in your inbox, ranked best-fit first.",
      },
      {
        icon: "inbox",
        title: "You decide — one tap",
        body: "See their measurables, video and profile. Mark interested or pass. When you're both in, you get their contact info. No cold outreach.",
      },
    ],
    valueHeading: "A fit score, both ways.",
    valueBody:
      "Every player sees exactly where they line up against your spot — position, metrics, academics, distance — so the players who show interest already know they fit. You get intent, not spray-and-pray.",
    features: [
      {
        icon: "zap",
        title: "Recruit by what you actually need",
        body: "Pitcher with a role and a velo floor. A catcher who can throw. A bat with a grad year and a GPA. Set the bar; only players who clear it get through.",
      },
      {
        icon: "map",
        title: "Built for small-college reality",
        body: "Distance, level and academics are baked into the fit — so you hear from players who can realistically come play for you.",
      },
      {
        icon: "shield",
        title: "Intent, not noise",
        body: "Players come to you. Every one in your inbox chose your program.",
      },
    ],
    featurePhone: {
      src: "/marketing/player-fits.png",
      alt: "Athletx player fits feed — spots ranked by fit",
    },
    showcase: {
      heading: "The player who fits you isn't always at the big showcase.",
      body: "The showcase circuit is expensive, and plenty of players who'd be perfect for your program can't afford to be seen on it. On Athletx, players come to you by fit — whatever camps they could or couldn't pay for — so you find the right ones, not just the well-funded ones.",
      stats: [
        { n: "By fit", label: "players matched to your exact needs — not a showcase roster" },
        { n: "No travel", label: "they come to you; no camp circuit to work to find them" },
        { n: "Every level", label: "HS, JUCO and transfers who fit, all in one place" },
      ],
    },
    joinHeading: "Join the waitlist",
    joinBody:
      "Drop your info and a member of our team will reach out personally with a link to get your account set up. We're onboarding small-college coaches in small waves.",
  },
  player: {
    eyebrow: "For players",
    headline: (
      <>
        Get recruited by the schools that{" "}
        <span className="text-accent">actually fit you.</span>
      </>
    ),
    sub: "Stop emailing coaches who never write back. Build one profile, see every open spot ranked by how well you fit, and show interest with one tap. The coaches who reach out are genuinely interested in what you bring to their program.",
    tagline: "HS recruits · JUCO · four-year transfers",
    phone: {
      src: "/marketing/player-fits.png",
      alt: "Athletx fits feed — open spots ranked by how well you fit",
    },
    problemHeading: "Recruiting feels like shouting into the void.",
    problemBody:
      "You send email after email to schools that never write back, with no idea who actually wants you — or where you'd even fit. The clock keeps ticking, and the programs that would love to have you are out there. You just can't see them.",
    stats: [
      { n: "Dozens", label: "of emails that never get a reply" },
      { n: "?", label: "no idea which schools actually want you" },
      { n: "The fit", label: "program you'd thrive at — unseen" },
    ],
    howHeading: "Build your profile. See where you fit. Get recruited.",
    steps: [
      {
        icon: "user",
        title: "Build your profile once",
        body: "Your positions, metrics, video, academics and what you're looking for. We even draft your bio from your profile.",
      },
      {
        icon: "compass",
        title: "See where you fit",
        body: "Every open spot on the platform, ranked by how well you match it — position, metrics, academics, distance. No more guessing.",
      },
      {
        icon: "hand",
        title: "Show interest — one tap",
        body: "Tell the coaches you're interested. Only the programs you choose see your profile — and you always hear back.",
      },
    ],
    valueHeading: "Find the right fit — not just the biggest name.",
    valueBody:
      "Your level, academics, distance and preferences shape your feed, so the spots you see are ones you could actually take — and the coaches who see you are the ones who need exactly what you bring.",
    features: [
      {
        icon: "shield",
        title: "You control the process",
        body: "Coaches don't browse you. You decide which programs see your profile, and when.",
      },
      {
        icon: "map",
        title: "Built for the right fit",
        body: "Level, academics, distance and your preferences shape your feed — so every spot is one you could actually play.",
      },
      {
        icon: "bell",
        title: "Always hear back",
        body: "Every program you show interest in gets your profile and responds. No more silence.",
      },
    ],
    featurePhone: {
      src: "/marketing/coach-inbox.png",
      alt: "A coach's inbox — your interest, ranked by fit",
    },
    showcase: {
      heading: "You're already paying for exposure. It's just not working.",
      body: "Families spend thousands every year on showcases, camps and travel ball — and still have no idea which college programs actually want their player. The schools that would be the perfect fit are often the ones that were never at that showcase.",
      stats: [
        { n: "$2,000+", label: "a year on showcases, camps and travel — with no guarantee a fitting coach ever sees you" },
        { n: "Right-fit", label: "programs that were never at the showcase you paid for" },
        { n: "One profile", label: "seen by every coach whose needs you match — free in the test group" },
      ],
    },
    joinHeading: "Join the waitlist",
    joinBody:
      "Drop your info and a member of our team will reach out personally with a link to set up your profile. We're onboarding players in small waves.",
  },
  parent: {
    eyebrow: "For parents",
    headline: (
      <>
        Get your player in front of the coaches who{" "}
        <span className="text-accent">actually want them.</span>
      </>
    ),
    sub: "You've put in the money and the miles. Athletx makes it count — one profile that puts your player in front of the programs that truly fit, with every opportunity visible to you and a response every time.",
    tagline: "For families of HS recruits, JUCO & transfers",
    phone: {
      src: "/marketing/player-fits.png",
      alt: "What your player sees — college spots ranked by how well they fit",
    },
    problemHeading: "You're doing everything right. It still feels like a black box.",
    problemBody:
      "Showcases, camps, travel ball, lessons — thousands of dollars and countless weekends. But you still don't know which programs actually want your player, and the emails you send vanish. The schools that would be perfect are out there; you just can't see them.",
    stats: [
      { n: "$2,000+", label: "a year on showcases, camps, travel and lessons" },
      { n: "Weekends", label: "of tournaments with no clear return" },
      { n: "Silence", label: "from most of the coaches you email" },
    ],
    howHeading: "How it works for your player.",
    steps: [
      {
        icon: "user",
        title: "Build one profile",
        body: "Metrics, video, academics and what they're looking for — all in one place. We even draft the bio. It takes about 15 minutes.",
      },
      {
        icon: "compass",
        title: "See where they fit",
        body: "Every open college spot, ranked by how well your player matches — position, metrics, academics, and distance from home.",
      },
      {
        icon: "hand",
        title: "They show interest — one tap",
        body: "Your player tells the coaches they're interested. Only the programs they choose see the profile, and the coaches respond.",
      },
    ],
    valueHeading: "Peace of mind, not guesswork.",
    valueBody:
      "You want to know your time and money are going somewhere real — and that your player lands where they'll actually play and earn a degree. Athletx keeps the whole process in the open.",
    features: [
      {
        icon: "shield",
        title: "You're never in the dark",
        body: "See every open spot and every program that shows interest. The whole process is visible to you, not hidden in your player's inbox.",
      },
      {
        icon: "map",
        title: "The right fit, not just the biggest name",
        body: "Academics, level and distance shape the matches — so your player lands somewhere they'll play, learn and belong.",
      },
      {
        icon: "bell",
        title: "Always a response",
        body: "Every program your player shows interest in gets their profile and responds. No more silence after camps and emails.",
      },
    ],
    featurePhone: {
      src: "/marketing/coach-inbox.png",
      alt: "A coach's inbox — your player's interest, ranked by fit",
    },
    showcase: {
      heading: "Exposure you've already paid for — finally pointed at the right programs.",
      body: "The big showcase isn't where every right-fit coach is looking, and it rewards the families who can afford to be everywhere. Athletx gets your player seen by the programs whose needs they actually match — by fit, not by budget — so the money you spend turns into real conversations.",
      stats: [
        { n: "By fit", label: "seen by the coaches who need exactly what your player brings" },
        { n: "Every level", label: "D2, D3, NAIA and JUCO programs — not just the big names" },
        { n: "Free", label: "to get your player on the list in the test group" },
      ],
    },
    joinHeading: "Get your player on the list",
    joinBody:
      "Drop your player's info and a member of our team will reach out personally with a link to set up their profile.",
  },
} as const;

function icon(name: string) {
  const p = { size: 22, strokeWidth: 2, "aria-hidden": true } as const;
  switch (name) {
    case "clipboard":
      return <ClipboardList {...p} />;
    case "star":
      return <Star {...p} />;
    case "inbox":
      return <Inbox {...p} />;
    case "user":
      return <UserCircle {...p} />;
    case "compass":
      return <Compass {...p} />;
    case "hand":
      return <Hand {...p} />;
    case "zap":
      return <Zap size={18} strokeWidth={2.5} aria-hidden />;
    case "map":
      return <MapPin size={18} strokeWidth={2.5} aria-hidden />;
    case "shield":
      return <ShieldCheck size={18} strokeWidth={2.5} aria-hidden />;
    case "bell":
      return <BellRing size={18} strokeWidth={2.5} aria-hidden />;
    default:
      return null;
  }
}

function AudienceHero({ audience }: { audience: PageAudience }) {
  const c = CONTENT[audience];
  return (
    <section className="relative overflow-hidden">
      <Glow />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className="eyebrow text-accent">{c.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            {c.headline}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-body-2">{c.sub}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#how"
              className="inline-flex h-[54px] items-center gap-2 rounded-cta bg-accent px-6 text-base font-semibold text-surface transition-colors hover:bg-accent-dark"
            >
              See how it works
              <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
            </a>
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-eyebrow text-muted-2">
            {c.tagline}
          </p>
        </div>
        <div className="flex justify-center md:justify-end">
          <PhoneFrame src={c.phone.src} alt={c.phone.alt} />
        </div>
      </div>
    </section>
  );
}

function Problem({ audience }: { audience: PageAudience }) {
  const c = CONTENT[audience];
  return (
    <section className="border-t border-divider/60 bg-surface/40">
      <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
        <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
          {c.problemHeading}
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-body-2">{c.problemBody}</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {c.stats.map((s) => (
            <div key={s.label} className="rounded-card border border-border bg-ground p-5">
              <div className="font-display text-3xl font-bold text-accent">{s.n}</div>
              <p className="mt-1 text-sm text-body-2">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ShowcaseSection({ audience }: { audience: PageAudience }) {
  const s = CONTENT[audience].showcase;
  return (
    <section>
      <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
        <p className="eyebrow text-accent">The real cost</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
          {s.heading}
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-body-2">{s.body}</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {s.stats.map((x) => (
            <div key={x.label} className="rounded-card border border-border bg-surface/60 p-5">
              <div className="font-display text-3xl font-bold text-accent">{x.n}</div>
              <p className="mt-1 text-sm leading-relaxed text-body-2">{x.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ParentLink() {
  return (
    <section>
      <div className="mx-auto max-w-5xl px-6 py-10 md:py-12">
        <Link
          href="/parents"
          className="flex flex-col items-start justify-between gap-4 rounded-card border border-border bg-surface/60 p-6 transition-colors hover:bg-surface sm:flex-row sm:items-center sm:p-7"
        >
          <div className="min-w-0">
            <p className="eyebrow text-accent">For parents</p>
            <p className="mt-1.5 text-xl font-bold tracking-tight text-ink">
              Helping your player get recruited?
            </p>
            <p className="mt-1 text-[15px] leading-relaxed text-body-2">
              See how Athletx turns the money and miles you&rsquo;re already
              spending into real conversations with the right programs.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-cta bg-accent px-5 py-3 text-sm font-semibold text-surface">
            See how it works
            <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
          </span>
        </Link>
      </div>
    </section>
  );
}

function HowItWorks({ audience }: { audience: PageAudience }) {
  const c = CONTENT[audience];
  return (
    <section id="how" className="scroll-mt-20">
      <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <p className="eyebrow text-accent">How it works</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          {c.howHeading}
        </h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {c.steps.map((s, i) => (
            <div key={s.title} className="relative rounded-card border border-border bg-surface/60 p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-pill bg-accent-soft text-accent">
                  {icon(s.icon)}
                </span>
                <span className="font-display text-2xl font-bold text-muted-2">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-xl font-bold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-body-2">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ValueSection({ audience }: { audience: PageAudience }) {
  const c = CONTENT[audience];
  return (
    <section className="border-y border-divider/60 bg-surface/40">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-20">
        <div className="order-2 flex justify-center md:order-1">
          <PhoneFrame src={c.featurePhone.src} alt={c.featurePhone.alt} />
        </div>
        <div className="order-1 md:order-2">
          <p className="eyebrow text-accent">Why it works</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {c.valueHeading}
          </h2>
          <p className="mt-4 text-lg text-body-2">{c.valueBody}</p>
          <ul className="mt-8 space-y-4">
            {c.features.map((f) => (
              <li key={f.title} className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-accent-soft text-accent">
                  {icon(f.icon)}
                </span>
                <div>
                  <p className="font-semibold text-ink">{f.title}</p>
                  <p className="mt-0.5 text-[15px] leading-relaxed text-body-2">{f.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

const TEST_GROUP_CAP = 10;

async function JoinSection({ audience }: { audience: PageAudience }) {
  // Parents sign their player up, so they share the player waitlist + count.
  const kind = audience === "coach" ? "coach" : "player";

  // Count signups to switch the copy once the founding group is full. The form
  // itself never closes — we keep collecting for the next wave.
  let count = 0;
  try {
    const supabase = createClient();
    const { data } = await supabase.rpc("waitlist_count", { p_kind: kind });
    if (typeof data === "number") count = data;
  } catch {
    /* function not available yet → show the open state */
  }
  const full = count >= TEST_GROUP_CAP;
  const spotsLeft = Math.max(0, TEST_GROUP_CAP - count);

  const heading = audience === "parent" ? "Get your player on the list" : "Join the waitlist";
  const openBody =
    audience === "coach"
      ? "The first 10 coaches to join become our founding test group — early access to Athletx, and a direct hand in shaping it with your feedback. Drop your info and we’ll reach out personally to get you set up."
      : audience === "parent"
        ? "The first 10 players to join become our founding test group. Get your player on the list — drop their info and a member of our team will reach out personally with a link to set up their profile."
        : "The first 10 players to join become our founding test group — early access to build your profile, and a direct hand in shaping the player side with your feedback. Drop your info and we’ll reach out personally to get you set up.";
  const fullBody =
    "Our founding test group is full — thank you! Join the waitlist for the next wave and we’ll reach out as soon as spots open up.";

  return (
    <section id="join" className="scroll-mt-20 border-t border-divider/60 bg-surface/40">
      <div className="mx-auto max-w-2xl px-6 py-16 md:py-24">
        <div className="text-center">
          <p className="eyebrow text-accent">{full ? "Next wave" : "Founding test group"}</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {heading}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-body-2">
            {full ? fullBody : openBody}
          </p>
          {!full && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-pill bg-accent-soft px-3.5 py-1.5 text-sm font-semibold text-accent">
              <span className="h-1.5 w-1.5 rounded-pill bg-accent" />
              {spotsLeft} of {TEST_GROUP_CAP} founding spots left
            </p>
          )}
        </div>
        <div className="mt-10 rounded-card border border-border bg-ground p-6 sm:p-8">
          <WaitlistForm kind={kind} />
        </div>
      </div>
    </section>
  );
}
