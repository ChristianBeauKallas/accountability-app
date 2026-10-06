"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Globe,
  X,
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { HeaderActions } from "@/components/HeaderActions";
import { ProgramFeed } from "@/components/program/ProgramFeed";
import {
  MetricTiles,
  StatRow,
  type Metric,
  type RowItem,
} from "@/components/player/StatBlock";
import { DIVISIONS, STATES } from "@/lib/constants";
import { climateDisplay } from "@/lib/climate";
import type { Program, StaffRole } from "@/lib/types";

export type StaffMember = {
  staff_role: StaffRole;
  profile: { full_name: string } | null;
};

export type ProgramStats = {
  positions: string[];
  minGpa: number | null;
  openNeeds: number;
};

const STAFF_LABEL: Record<StaffRole, string> = {
  head: "Head coach",
  assistant: "Assistant coach",
  recruiting_coordinator: "Recruiting coordinator",
};

type Tab = "about" | "updates" | "facilities";

export function SchoolProfile({
  program,
  stats,
  staff,
  editable,
  viewerId,
  showBack = false,
  isFollowing = false,
}: {
  program: Program;
  stats: ProgramStats;
  staff: StaffMember[];
  editable: boolean;
  viewerId: string;
  showBack?: boolean;
  isFollowing?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("about");
  const [editing, setEditing] = useState(false);
  const [following, setFollowing] = useState(isFollowing);
  const [followBusy, setFollowBusy] = useState(false);

  async function toggleFollow() {
    setFollowBusy(true);
    const next = !following;
    setFollowing(next);
    if (next) {
      await supabase
        .from("program_followers")
        .insert({ player_id: viewerId, program_id: program.id });
    } else {
      await supabase
        .from("program_followers")
        .delete()
        .eq("player_id", viewerId)
        .eq("program_id", program.id);
    }
    setFollowBusy(false);
  }

  if (editing) {
    return <EditForm program={program} onDone={() => setEditing(false)} />;
  }

  return (
    <main className="px-5 pt-12">
      <div className="flex items-start justify-between">
        {showBack ? (
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 text-sm font-semibold text-muted"
          >
            <ArrowLeft size={16} strokeWidth={2} aria-hidden />
            Back
          </button>
        ) : (
          <p className="eyebrow">Program</p>
        )}
        <HeaderActions
          showBell={!editable}
          onEdit={editable ? () => setEditing(true) : undefined}
          editLabel="Edit program"
        />
      </div>

      <div className="mt-3 flex items-center gap-4">
        <Avatar name={program.name} src={program.logo_url} size={64} />
        <div className="min-w-0">
          <h1 className="flex items-center gap-1.5 text-2xl font-display font-bold leading-tight">
            <span className="truncate">{program.name}</span>
            {program.verified && (
              <BadgeCheck
                size={18}
                strokeWidth={2}
                className="shrink-0 text-accent"
                aria-label="Verified program"
              />
            )}
          </h1>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
            <MapPin size={13} strokeWidth={2} aria-hidden />
            {[program.city, program.state].filter(Boolean).join(", ") || "—"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Chip tone="accent">{program.division}</Chip>
        {program.conference && <Chip>{program.conference}</Chip>}
      </div>

      {!editable && (
        <Button
          variant={following ? "secondary" : "primary"}
          full
          className="mt-4"
          onClick={toggleFollow}
          disabled={followBusy}
        >
          {following ? (
            <>
              <BookmarkCheck size={18} strokeWidth={2} aria-hidden />
              Following
            </>
          ) : (
            <>
              <Bookmark size={18} strokeWidth={2} aria-hidden />
              Follow school
            </>
          )}
        </Button>
      )}

      <SegmentedControl
        className="mt-5"
        value={tab}
        onChange={setTab}
        segments={[
          { value: "about", label: "About" },
          { value: "updates", label: "Updates" },
          { value: "facilities", label: "Facilities" },
        ]}
      />

      <div className="mt-5">
        {tab === "about" && (
          <AboutTab program={program} stats={stats} staff={staff} editable={editable} />
        )}
        {tab === "updates" && (
          <ProgramFeed
            programId={program.id}
            uploaderId={viewerId}
            kind="update"
            editable={editable}
          />
        )}
        {tab === "facilities" && (
          <ProgramFeed
            programId={program.id}
            uploaderId={viewerId}
            kind="facility"
            editable={editable}
          />
        )}
      </div>
    </main>
  );
}

/* ------------------------------ About tab ------------------------------- */

function AboutTab({
  program,
  stats,
  staff,
  editable,
}: {
  program: Program;
  stats: ProgramStats;
  staff: StaffMember[];
  editable: boolean;
}) {
  const climate = climateDisplay(program.state);
  const minGpa = program.min_gpa ?? stats.minGpa;
  const pct = programCompleteness(program);

  // Headline numbers a recruit weighs before applying.
  const tiles: Metric[] = [
    { value: String(stats.openNeeds), label: "Open spots", tone: "accent" },
  ];
  if (minGpa != null)
    tiles.push({
      value: minGpa.toFixed(2),
      unit: minGpa <= 4 ? "/ 4.0" : undefined,
      label: "Min GPA",
      tone: "gold",
    });
  if (program.enrollment != null)
    tiles.push({
      value: program.enrollment.toLocaleString(),
      label: "Enrollment",
      tone: "accent",
    });
  if (program.record_last_season)
    tiles.push({
      value: program.record_last_season,
      label: "Last season",
      tone: "accent",
    });

  // Descriptive details — only what's actually set (no empty dashes).
  const details: RowItem[] = [
    { label: "Level", value: program.division },
    program.conference
      ? { label: "Conference", value: program.conference }
      : null,
    climate ? { label: "Weather", value: climate } : null,
  ].filter(Boolean) as RowItem[];

  return (
    <div>
      {editable && pct < 100 && (
        <Card className="mb-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-ink">Page strength</span>
            <span className="tabular-nums text-muted">{pct}%</span>
          </div>
          <ProgressBar value={pct} />
          <p className="text-xs text-body-2">
            A complete page gives recruits confidence. Add what&rsquo;s missing.
          </p>
        </Card>
      )}

      <div>
        <h2 className="eyebrow mb-2">About</h2>
        {program.about ? (
          <p className="text-[15px] leading-relaxed text-body-2">{program.about}</p>
        ) : (
          <p className="text-sm text-muted-2">No summary yet.</p>
        )}
      </div>

      {program.recruiting_pitch && (
        <Section title="What we recruit">
          <p className="text-[15px] leading-relaxed text-body-2">
            {program.recruiting_pitch}
          </p>
        </Section>
      )}

      <Section title="At a glance">
        <MetricTiles tiles={tiles} />
        <StatRow items={details} className="mt-3" />
      </Section>

      {stats.positions.length > 0 && (
        <Section title="Looking for">
          <div className="flex flex-wrap gap-2">
            {stats.positions.map((p) => (
              <Chip key={p} tone="accent">
                {p}
              </Chip>
            ))}
          </div>
        </Section>
      )}

      {(staff.length > 0 || editable) && (
        <Section title="Staff">
          <ul className="space-y-2">
            {staff.map((s, i) => (
              <li key={i} className="flex items-center gap-3">
                <Avatar name={s.profile?.full_name ?? "Coach"} size={36} />
                <div>
                  <p className="text-[15px] font-medium text-ink">
                    {s.profile?.full_name ?? "Coach"}
                  </p>
                  <p className="text-xs text-muted-2">{STAFF_LABEL[s.staff_role]}</p>
                </div>
              </li>
            ))}
            {staff.length === 0 && (
              <li className="text-sm text-muted-2">No staff listed.</li>
            )}
          </ul>
        </Section>
      )}

      {program.website && (
        <a
          href={program.website}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent"
        >
          <Globe size={16} strokeWidth={2} aria-hidden />
          {program.website.replace(/^https?:\/\//, "")}
        </a>
      )}
    </div>
  );
}

function programCompleteness(p: Program): number {
  const checks = [
    !!p.about,
    !!p.conference,
    !!p.website,
    !!p.record_last_season,
    p.enrollment != null,
    p.min_gpa != null,
    !!p.recruiting_pitch,
    !!p.logo_url,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="eyebrow mb-2">{title}</h2>
      {children}
    </section>
  );
}

/* ------------------------------- Edit ----------------------------------- */

function EditForm({
  program,
  onDone,
}: {
  program: Program;
  onDone: () => void;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [name, setName] = useState(program.name);
  const [division, setDivision] = useState(program.division);
  const [city, setCity] = useState(program.city ?? "");
  const [state, setState] = useState(program.state ?? "");
  const [conference, setConference] = useState(program.conference ?? "");
  const [website, setWebsite] = useState(program.website ?? "");
  const [record, setRecord] = useState(program.record_last_season ?? "");
  const [enrollment, setEnrollment] = useState(
    program.enrollment?.toString() ?? ""
  );
  const [minGpa, setMinGpa] = useState(program.min_gpa?.toString() ?? "");
  const [pitch, setPitch] = useState(program.recruiting_pitch ?? "");
  const [about, setAbout] = useState(program.about ?? "");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [coachId, setCoachId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !active) return;
      setCoachId(user.id);
      const { data } = await supabase
        .from("contact_info")
        .select("email, phone")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      setContactEmail(data?.email ?? user.email ?? "");
      setContactPhone(data?.phone ?? "");
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setError("");
    if (!name.trim() || !division || !state) {
      setError("Name, division and state are required.");
      return;
    }
    setSaving(true);
    const { error: err } = await supabase
      .from("programs")
      .update({
        name: name.trim(),
        division,
        city: city.trim() || null,
        state,
        conference: conference.trim() || null,
        website: website.trim() || null,
        record_last_season: record.trim() || null,
        enrollment: enrollment === "" ? null : Number(enrollment),
        min_gpa: minGpa === "" ? null : Number(minGpa),
        recruiting_pitch: pitch.trim() || null,
        about: about.trim() || null,
      })
      .eq("id", program.id);

    let cErr = null;
    if (coachId) {
      const res = await supabase.from("contact_info").upsert({
        user_id: coachId,
        email: contactEmail.trim() || null,
        phone: contactPhone.trim() || null,
        updated_at: new Date().toISOString(),
      });
      cErr = res.error;
    }

    setSaving(false);
    if (err || cErr) {
      setError((err ?? cErr)?.message ?? "Couldn't save. Try again.");
      return;
    }
    router.refresh();
    onDone();
  }

  return (
    <main className="px-5 pt-12 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold tracking-tight">
          Edit program
        </h1>
        <button onClick={onDone} className="text-muted" aria-label="Cancel">
          <X size={22} strokeWidth={2} />
        </button>
      </div>

      <div className="mt-6 space-y-5">
        <Field label="Program name" htmlFor="pn">
          <Input id="pn" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Division" htmlFor="dv">
            <Select
              id="dv"
              value={division}
              onChange={(e) => setDivision(e.target.value as Program["division"])}
            >
              {DIVISIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="State" htmlFor="st">
            <Select id="st" value={state} onChange={(e) => setState(e.target.value)}>
              <option value="">Select</option>
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="City" htmlFor="ci">
            <Input id="ci" value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
          <Field label="Conference" htmlFor="cf">
            <Input
              id="cf"
              value={conference}
              onChange={(e) => setConference(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Last season record" htmlFor="rec" hint="e.g. 34-18">
            <Input id="rec" value={record} onChange={(e) => setRecord(e.target.value)} />
          </Field>
          <Field label="Enrollment" htmlFor="en">
            <Input
              id="en"
              type="number"
              inputMode="numeric"
              placeholder="6500"
              value={enrollment}
              onChange={(e) => setEnrollment(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Minimum GPA" htmlFor="mg" hint="Academic floor for recruits.">
          <Input
            id="mg"
            type="number"
            step="0.01"
            min="0"
            max="4"
            inputMode="decimal"
            placeholder="2.5"
            value={minGpa}
            onChange={(e) => setMinGpa(e.target.value)}
          />
        </Field>

        <Field label="Website" htmlFor="wb">
          <Input
            id="wb"
            type="url"
            inputMode="url"
            placeholder="https://…"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </Field>

        {/* Recruiting contact — shared with a player only on a mutual match */}
        <div className="rounded-input border border-border bg-surface p-4 space-y-4">
          <div>
            <p className="eyebrow">Your recruiting contact</p>
            <p className="mt-1 text-xs text-body-2">
              Shared with a player only after a mutual match — never public.
            </p>
          </div>
          <Field label="Contact email" htmlFor="cem">
            <Input
              id="cem"
              type="email"
              inputMode="email"
              placeholder="coach@school.edu"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </Field>
          <Field label="Phone" htmlFor="cph" hint="Optional">
            <Input
              id="cph"
              type="tel"
              inputMode="tel"
              placeholder="(555) 555-5555"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </Field>
        </div>

        <Field
          label="What we recruit"
          hint="A line or two on the type of player you want."
          htmlFor="pitch"
        >
          <Textarea
            id="pitch"
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            placeholder="We target athletic, high-motor players who can hit…"
            maxLength={300}
          />
        </Field>

        <Field label="About the program" htmlFor="ab">
          <Textarea
            id="ab"
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            maxLength={600}
          />
        </Field>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-3">
          <Button variant="secondary" full onClick={onDone} disabled={saving}>
            Cancel
          </Button>
          <Button full onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </main>
  );
}
