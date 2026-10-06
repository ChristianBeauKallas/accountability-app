"use client";

import {
  MapPin,
  Check,
  Info,
  Bell,
  Pencil,
  MoreVertical,
  Bookmark,
  ListChecks,
  User,
  Inbox,
  ClipboardList,
  Building2,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Avatar } from "@/components/ui/Avatar";
import { BaseballIcon } from "@/components/ui/BaseballIcon";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { MetricTiles, StatRow } from "@/components/player/StatBlock";

export type ScreenKey =
  | "fits"
  | "fits-interested"
  | "tracker"
  | "following"
  | "profile"
  | "inbox"
  | "needs"
  | "following-coach"
  | "program";

/* ----------------------------- Tab bar ----------------------------- */

type TabDef = { key: string; label: string; icon: LucideIcon; tour: string };

const PLAYER_TABS: TabDef[] = [
  { key: "fits", label: "Fits", icon: BaseballIcon as unknown as LucideIcon, tour: "tab-fits" },
  { key: "tracker", label: "My Spots", icon: ListChecks, tour: "tab-tracker" },
  { key: "following", label: "Following", icon: Bookmark, tour: "tab-following" },
  { key: "profile", label: "Profile", icon: User, tour: "tab-profile" },
];

const COACH_TABS: TabDef[] = [
  { key: "inbox", label: "Inbox", icon: Inbox, tour: "tab-inbox" },
  { key: "needs", label: "Needs", icon: ClipboardList, tour: "tab-needs" },
  { key: "following", label: "Following", icon: Bookmark, tour: "tab-following" },
  { key: "program", label: "Program", icon: Building2, tour: "tab-program" },
];

function MockTabBar({ tabs, active }: { tabs: TabDef[]; active: string }) {
  return (
    <nav className="shrink-0 border-t border-border bg-surface">
      <ul className="grid grid-cols-4 h-[76px]">
        {tabs.map((tab) => {
          const on = tab.key === active;
          const Icon = tab.icon;
          return (
            <li key={tab.key}>
              <div
                data-tour={tab.tour}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1",
                  on ? "text-accent" : "text-muted-2"
                )}
              >
                <Icon size={22} strokeWidth={2} aria-hidden />
                <span className="text-[11px] font-semibold">{tab.label}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* --------------------------- Screen shell --------------------------- */

function Shell({
  tabs,
  active,
  children,
}: {
  tabs: TabDef[];
  active: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col bg-ground">
      <div className="flex-1 overflow-hidden px-5 pt-10">{children}</div>
      <MockTabBar tabs={tabs} active={active} />
    </div>
  );
}

// Header row with the greeting eyebrow and the top-right bell + ⋯ cluster
// (the notifications tour step spotlights this).
function MockTopBar({ eyebrow }: { eyebrow: string }) {
  return (
    <div className="flex items-start justify-between">
      <p className="eyebrow">{eyebrow}</p>
      <div data-tour="m-menu" className="flex items-center gap-2.5 text-muted-2">
        <Bell size={20} strokeWidth={2} aria-hidden />
        <MoreVertical size={20} strokeWidth={2} aria-hidden />
      </div>
    </div>
  );
}

function ScreenTitle({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div className="mb-4">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="mt-1 text-3xl font-display font-bold tracking-tight">{title}</h1>
      {sub && <p className="mt-1 text-[15px] text-body-2">{sub}</p>}
    </div>
  );
}

/* ------------------------------ Fit card ---------------------------- */

function FitCardMock({
  primary = false,
  applied = false,
}: {
  primary?: boolean;
  applied?: boolean;
}) {
  return (
    <div data-tour={primary ? "m-card" : undefined}>
      <Card className="space-y-3">
        <div className="flex items-start gap-3">
          <Avatar name="Dodge City CC" size={46} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <h3 className="min-w-0 truncate text-lg font-display font-semibold leading-tight">
                Dodge City CC
              </h3>
              <span className="shrink-0 whitespace-nowrap text-xs font-semibold uppercase tracking-eyebrow text-muted-2">
                JUCO · KJCCC
              </span>
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
              <MapPin size={14} strokeWidth={2} aria-hidden />
              <span className="truncate">Dodge City, KS · 150 mi</span>
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Bookmark size={20} strokeWidth={2} className="text-muted-2" aria-hidden />
            <div className="text-right">
              <div className="font-display text-[26px] font-bold leading-none text-accent tabular-nums">
                93
              </div>
              <p className="mt-0.5 text-[10px] uppercase tracking-eyebrow text-muted-2">fit</p>
            </div>
          </div>
        </div>

        <p className="text-[15px] font-semibold text-ink">
          Middle infield — 2026 / 2027
        </p>

        <div className="flex flex-wrap gap-2">
          <Chip tone="accent">SS</Chip>
          <Chip tone="accent">2B</Chip>
          <Chip>2026–27</Chip>
          <Chip tone="metric">GPA 2.5+</Chip>
          <Chip tone="metric">EV 88+</Chip>
        </div>

        <div className="space-y-1.5 border-t border-divider pt-3">
          <p className="text-sm leading-snug text-body-2">
            <span className="font-semibold text-ink">What they&rsquo;re looking for: </span>
            versatility, glove
          </p>
          <p
            data-tour={primary ? "m-why" : undefined}
            className="text-sm leading-snug text-body-2"
          >
            <span className="font-semibold text-ink">Why you fit: </span>
            Plays SS/2B · 150 mi · Clears 2.5 GPA
          </p>
        </div>

        {applied ? (
          <div className="flex h-12 w-full items-center justify-center gap-1.5 rounded-btn bg-accent-soft text-base font-semibold text-accent">
            <Check size={18} strokeWidth={2.5} aria-hidden />
            Interested — coach notified
          </div>
        ) : (
          <button className="flex h-12 w-full items-center justify-center gap-1.5 rounded-btn bg-accent text-base font-semibold text-surface">
            I&rsquo;m Interested
          </button>
        )}
      </Card>
    </div>
  );
}

function FitCardMini() {
  return (
    <Card className="space-y-3">
      <div className="flex items-start gap-3">
        <Avatar name="Barton CC" size={46} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="min-w-0 truncate text-lg font-display font-semibold leading-tight">
              Barton CC
            </h3>
            <span className="shrink-0 whitespace-nowrap text-xs font-semibold uppercase tracking-eyebrow text-muted-2">
              JUCO · KJCCC
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
            <MapPin size={14} strokeWidth={2} aria-hidden />
            <span className="truncate">Great Bend, KS · 165 mi</span>
          </p>
        </div>
        <div className="text-right">
          <div className="font-display text-[26px] font-bold leading-none text-accent tabular-nums">
            88
          </div>
          <p className="mt-0.5 text-[10px] uppercase tracking-eyebrow text-muted-2">fit</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip tone="accent">SS</Chip>
        <Chip>2026</Chip>
        <Chip tone="metric">60 ≤ 7.0</Chip>
      </div>
    </Card>
  );
}

/* ------------------------------ Screens ----------------------------- */

function FitsScreen({ applied = false }: { applied?: boolean }) {
  return (
    <Shell tabs={PLAYER_TABS} active="fits">
      <MockTopBar eyebrow="Hey Jordan" />
      <div className="mt-1 flex items-center gap-1.5">
        <h1 className="text-3xl font-display font-bold tracking-tight">Recommended Fits</h1>
        <span
          data-tour="m-info"
          className="flex h-7 w-7 items-center justify-center text-muted-2"
        >
          <Info size={19} strokeWidth={2} aria-hidden />
        </span>
      </div>
      <p className="mb-4 mt-1 text-[15px] text-body-2">6 spots match you right now.</p>
      <div className="space-y-3.5">
        <FitCardMock primary applied={applied} />
        <FitCardMini />
      </div>
    </Shell>
  );
}

function StatusCard({
  name,
  loc,
  status,
  tone,
  note,
  fit,
}: {
  name: string;
  loc: string;
  status: string;
  tone: "status-interested" | "status-new" | "status-closed";
  note: string;
  fit: number;
}) {
  return (
    <Card className="flex items-center gap-3">
      <Avatar name={name} size={42} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-[15px] font-semibold leading-tight">
          {name}
        </h3>
        <p className="truncate text-xs text-muted">{loc}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <Chip tone={tone} size="sm">
            {status}
          </Chip>
          <span className="text-[11px] text-muted-2">{note}</span>
        </div>
      </div>
      <div className="text-right">
        <div className="font-display text-xl font-bold leading-none text-accent tabular-nums">
          {fit}
        </div>
        <p className="mt-0.5 text-[9px] uppercase tracking-eyebrow text-muted-2">fit</p>
      </div>
    </Card>
  );
}

function TrackerScreen() {
  return (
    <Shell tabs={PLAYER_TABS} active="tracker">
      <ScreenTitle
        eyebrow="Your spots"
        title="My Spots"
        sub="Everywhere you've shown interest — and where it stands."
      />
      <div className="mb-4 flex gap-1.5 rounded-pill bg-chip p-1">
        {[
          ["Interested", true],
          ["Mutual", false],
          ["Closed", false],
        ].map(([label, on]) => (
          <span
            key={label as string}
            className={cn(
              "flex-1 rounded-pill py-1.5 text-center text-[13px] font-semibold",
              on ? "bg-surface text-ink shadow-card" : "text-muted-2"
            )}
          >
            {label as string}
          </span>
        ))}
      </div>
      <div className="space-y-3">
        <StatusCard
          name="Dodge City CC"
          loc="JUCO · Dodge City, KS"
          status="Mutual interest"
          tone="status-new"
          note="Coach replied · contact unlocked"
          fit={93}
        />
        <StatusCard
          name="Barton CC"
          loc="JUCO · Great Bend, KS"
          status="Interested"
          tone="status-interested"
          note="Sent 3d ago"
          fit={88}
        />
        <StatusCard
          name="Cowley College"
          loc="JUCO · Arkansas City, KS"
          status="Interested"
          tone="status-interested"
          note="Sent 1w ago"
          fit={81}
        />
      </div>
    </Shell>
  );
}

function FollowRow({ name, meta }: { name: string; meta: string }) {
  return (
    <Card className="flex items-center gap-3">
      <Avatar name={name} size={44} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-[15px] font-semibold leading-tight">
          {name}
        </h3>
        <p className="truncate text-xs text-muted">{meta}</p>
      </div>
      <Bookmark size={20} strokeWidth={2.5} className="fill-accent text-accent" aria-hidden />
    </Card>
  );
}

function FollowingScreen() {
  return (
    <Shell tabs={PLAYER_TABS} active="following">
      <ScreenTitle title="Following" sub="Schools you've saved to revisit." />
      <div className="space-y-3">
        <FollowRow name="Seminole State" meta="JUCO · Seminole, OK" />
        <FollowRow name="Johnson County CC" meta="JUCO · Overland Park, KS" />
        <FollowRow name="Butler CC" meta="JUCO · El Dorado, KS" />
      </div>
    </Shell>
  );
}

function ProfileScreen() {
  return (
    <Shell tabs={PLAYER_TABS} active="profile">
      {/* Header — mirrors the real profile page */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2.5 text-muted-2">
          <Bell size={20} strokeWidth={2} aria-hidden />
          <span className="flex items-center gap-1 rounded-pill border border-border px-2.5 py-1 text-xs font-semibold text-ink">
            <Pencil size={13} strokeWidth={2} aria-hidden /> Edit
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <Avatar name="Jordan Blake" size={64} />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-display font-bold leading-tight">
            Jordan Blake
          </h1>
          <p className="text-sm text-muted">SS · Class of 2026</p>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
            <MapPin size={13} strokeWidth={2} aria-hidden /> Wichita, KS
          </p>
        </div>
      </div>

      <SegmentedControl
        className="mt-5"
        value="data"
        onChange={() => {}}
        segments={[
          { value: "data", label: "Bio" },
          { value: "updates", label: "Updates" },
          { value: "highlights", label: "Highlights" },
        ]}
      />

      <div className="mt-5">
        {/* About */}
        <div>
          <h2 className="eyebrow mb-2">About</h2>
          <p className="text-[15px] leading-relaxed text-body-2">
            Twitchy middle infielder with plus hands and a quick first step.
            Three-year varsity starter hitting .410 with a 3.6 GPA — looking for
            a program that develops middle infielders.
          </p>
        </div>

        <div className="mt-5">
          <StatRow
            items={[
              { label: "Height", value: "6'1\"" },
              { label: "Weight", value: "190" },
              { label: "Bats", value: "R" },
              { label: "Throws", value: "R" },
            ]}
          />
          <MetricTiles
            className="mt-3"
            tiles={[
              { value: "92", unit: "mph", label: "Exit velo", tone: "accent" },
              { value: "6.8", unit: "sec", label: "60 yard", tone: "accent" },
              { value: "84", unit: "mph", label: "INF velo", tone: "accent" },
              { value: "3.60", unit: "/ 4.0", label: "GPA", tone: "gold" },
            ]}
          />
        </div>

        {/* Positions */}
        <section className="mt-6">
          <h2 className="eyebrow mb-2">Positions</h2>
          <div className="flex flex-wrap gap-2">
            <Chip tone="accent">★ SS</Chip>
            <Chip>2B</Chip>
            <Chip>3B</Chip>
          </div>
        </section>

        {/* Interested in */}
        <section className="mt-6">
          <h2 className="eyebrow mb-2">Interested in</h2>
          <div className="divide-y divide-divider rounded-card border border-border bg-surface">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-eyebrow text-muted-2">
                Levels
              </span>
              <div className="flex flex-wrap justify-end gap-1.5">
                <Chip tone="accent" size="sm">
                  D2
                </Chip>
                <Chip tone="accent" size="sm">
                  JUCO
                </Chip>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-eyebrow text-muted-2">
                Location
              </span>
              <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                <MapPin size={14} strokeWidth={2} aria-hidden className="text-muted-2" />
                Warm, TX
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-eyebrow text-muted-2">
                School size
              </span>
              <span className="text-sm font-medium text-ink">Medium</span>
            </div>
          </div>
        </section>
      </div>
    </Shell>
  );
}

/* ------------------------------ Coach ------------------------------- */

function ApplicantCard({
  name,
  meta,
  want,
  fit,
}: {
  name: string;
  meta: string;
  want: string;
  fit: number;
}) {
  return (
    <Card className="space-y-3">
      <div className="flex items-start gap-3">
        <Avatar name={name} size={46} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-display font-semibold leading-tight">
            {name}
          </h3>
          <p className="truncate text-sm text-muted">{meta}</p>
        </div>
        <div className="text-right">
          <div className="font-display text-[26px] font-bold leading-none text-accent tabular-nums">
            {fit}
          </div>
          <p className="mt-0.5 text-[10px] uppercase tracking-eyebrow text-muted-2">fit</p>
        </div>
      </div>
      <p className="text-sm text-body-2">
        <span className="font-semibold text-ink">Wants: </span>
        {want}
      </p>
    </Card>
  );
}

function InboxScreen() {
  return (
    <Shell tabs={COACH_TABS} active="inbox">
      <MockTopBar eyebrow="Hey Coach" />
      <h1 className="mt-1 text-3xl font-display font-bold tracking-tight">Inbox</h1>
      <p className="mb-4 mt-1 text-[15px] text-body-2">
        4 players want in · best fit first.
      </p>
      <div className="space-y-3.5">
        <ApplicantCard
          name="Jordan Blake"
          meta="SS / 2B · 2026 · Wichita, KS"
          want="Middle infield — 2026/27"
          fit={93}
        />
        <ApplicantCard
          name="Marcus Reed"
          meta="RHP · 2026 · Tulsa, OK"
          want="Weekend starter"
          fit={89}
        />
      </div>
    </Shell>
  );
}

function NeedCard({
  title,
  level,
  positions,
  count,
}: {
  title: string;
  level: string;
  positions: string[];
  count: number;
}) {
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{level}</p>
          <p className="mt-1 text-[15px] font-semibold text-ink">{title}</p>
        </div>
        <Chip tone="status-new" size="sm">
          Open
        </Chip>
      </div>
      <div className="flex flex-wrap gap-2">
        {positions.map((p) => (
          <Chip key={p} tone="accent">
            {p}
          </Chip>
        ))}
      </div>
      <p className="text-sm text-body-2">
        <span className="font-semibold text-ink">{count}</span> interested
      </p>
    </Card>
  );
}

function NeedsScreen() {
  return (
    <Shell tabs={COACH_TABS} active="needs">
      <ScreenTitle
        title="Needs"
        sub="Post the spots you're recruiting for — only players who fit see them."
      />
      <div className="space-y-3.5">
        <NeedCard
          title="Middle infield — 2026/27"
          level="JUCO · KJCCC"
          positions={["SS", "2B"]}
          count={6}
        />
        <NeedCard
          title="Weekend starter — 2026"
          level="JUCO · KJCCC"
          positions={["RHP", "LHP"]}
          count={4}
        />
      </div>
    </Shell>
  );
}

function CoachFollowingScreen() {
  return (
    <Shell tabs={COACH_TABS} active="following">
      <ScreenTitle title="Following" sub="Players you're keeping an eye on." />
      <div className="space-y-3">
        <FollowRow name="Jordan Blake" meta="SS / 2B · 2026 · Wichita, KS" />
        <FollowRow name="Marcus Reed" meta="RHP · 2026 · Tulsa, OK" />
        <FollowRow name="Eli Navarro" meta="C · 2027 · Omaha, NE" />
      </div>
    </Shell>
  );
}

function ProgramScreen() {
  return (
    <Shell tabs={COACH_TABS} active="program">
      <div className="flex items-center gap-4">
        <Avatar name="Dodge City CC" size={64} />
        <div className="min-w-0">
          <h1 className="text-2xl font-display font-bold leading-tight tracking-tight">
            Dodge City CC
          </h1>
          <p className="text-[15px] text-body-2">JUCO · KJCCC</p>
          <p className="flex items-center gap-1 text-sm text-muted">
            <MapPin size={13} strokeWidth={2} aria-hidden /> Dodge City, KS
          </p>
        </div>
      </div>
      <p className="mt-4 text-[14px] leading-relaxed text-body-2">
        JUCO contender with a strong four-year transfer pipeline. 11 players moved
        to D1 programs over the last three seasons.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Chip>Turf infield</Chip>
        <Chip>Indoor cages</Chip>
        <Chip>TrackMan</Chip>
        <Chip>New clubhouse</Chip>
      </div>
      <div className="mt-5">
        <p className="eyebrow mb-2">Latest update</p>
        <Card className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-accent-soft text-accent">
            <Clock size={15} strokeWidth={2} aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Fall ID camp — Nov 9</p>
            <p className="text-xs text-muted">Open to 2026 & 2027 infielders.</p>
          </div>
        </Card>
      </div>
    </Shell>
  );
}

/* ------------------------------ Router ------------------------------ */

export function MockScreen({ screen }: { screen: ScreenKey }) {
  switch (screen) {
    case "fits":
      return <FitsScreen />;
    case "fits-interested":
      return <FitsScreen applied />;
    case "tracker":
      return <TrackerScreen />;
    case "following":
      return <FollowingScreen />;
    case "profile":
      return <ProfileScreen />;
    case "inbox":
      return <InboxScreen />;
    case "needs":
      return <NeedsScreen />;
    case "following-coach":
      return <CoachFollowingScreen />;
    case "program":
      return <ProgramScreen />;
    default:
      return null;
  }
}
