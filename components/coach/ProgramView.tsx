"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, MapPin, Globe, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { SignOutButton } from "@/components/SignOutButton";
import { DIVISIONS, STATES } from "@/lib/constants";
import type { Program, StaffRole } from "@/lib/types";

export type StaffMember = {
  staff_role: StaffRole;
  profile: { full_name: string } | null;
};

const STAFF_LABEL: Record<StaffRole, string> = {
  head: "Head coach",
  assistant: "Assistant coach",
  recruiting_coordinator: "Recruiting coordinator",
};

export function ProgramView({
  program,
  staff,
}: {
  program: Program;
  staff: StaffMember[];
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return <EditForm program={program} onDone={() => setEditing(false)} />;
  }

  return (
    <main className="px-5 pt-12">
      <div className="flex items-start justify-between">
        <p className="eyebrow">Program</p>
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 text-sm font-semibold text-accent"
        >
          <Pencil size={15} strokeWidth={2} aria-hidden />
          Edit
        </button>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <Avatar name={program.name} src={program.logo_url} size={64} />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-display font-bold leading-tight">
            {program.name}
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

      {program.about && (
        <Card className="mt-5">
          <p className="text-[15px] leading-relaxed text-body-2">
            {program.about}
          </p>
        </Card>
      )}

      {program.website && (
        <a
          href={program.website}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent"
        >
          <Globe size={16} strokeWidth={2} aria-hidden />
          {program.website.replace(/^https?:\/\//, "")}
        </a>
      )}

      <section className="mt-6">
        <h2 className="eyebrow mb-2">Staff</h2>
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
        </ul>
      </section>

      <SignOutButton />
    </main>
  );
}

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
  const [about, setAbout] = useState(program.about ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
        about: about.trim() || null,
      })
      .eq("id", program.id);
    setSaving(false);
    if (err) {
      setError(err.message);
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

        <Field label="About the program" htmlFor="ab">
          <Textarea
            id="ab"
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            maxLength={400}
          />
        </Field>

        {error && <p className="text-sm text-warm-text">{error}</p>}

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
