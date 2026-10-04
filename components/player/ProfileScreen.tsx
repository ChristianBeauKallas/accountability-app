"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, X, Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { HeaderActions } from "@/components/HeaderActions";
import { PlayerFeed } from "@/components/player/PlayerFeed";
import { StatBlock } from "@/components/player/StatBlock";
import { profileCompleteness } from "@/lib/fit";
import {
  POSITIONS,
  DIVISIONS,
  STATES,
  BATS,
  THROWS,
  isPitcher,
  isCatcher,
  isOutfielder,
} from "@/lib/constants";
import { CLIMATES } from "@/lib/climate";
import type { Player, Profile } from "@/lib/types";

function climateLabel(value: string | null): string | null {
  return CLIMATES.find((c) => c.value === value)?.label ?? null;
}

type Tab = "data" | "updates" | "highlights";

export function ProfileScreen({
  profile,
  player,
}: {
  profile: Profile;
  player: Player;
}) {
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<Tab>("data");

  if (editing) {
    return (
      <EditForm
        profile={profile}
        player={player}
        onDone={() => setEditing(false)}
      />
    );
  }

  return (
    <main className="px-5 pt-12">
      <Header profile={profile} player={player} onEdit={() => setEditing(true)} />

      <SegmentedControl
        className="mt-5"
        value={tab}
        onChange={setTab}
        segments={[
          { value: "data", label: "Bio" },
          { value: "updates", label: "Updates" },
          { value: "highlights", label: "Highlights" },
        ]}
      />

      <div className="mt-5">
        {tab === "data" && <DataTab player={player} />}
        {tab === "updates" && (
          <PlayerFeed playerId={profile.id} kind="update" editable />
        )}
        {tab === "highlights" && (
          <PlayerFeed playerId={profile.id} kind="highlight" editable />
        )}
      </div>
    </main>
  );
}

/* ------------------------------ Header --------------------------------- */

function Header({
  profile,
  player,
  onEdit,
}: {
  profile: Profile;
  player: Player;
  onEdit: () => void;
}) {
  return (
    <>
      <div className="flex items-start justify-between">
        <p className="eyebrow">Profile</p>
        <HeaderActions showBell onEdit={onEdit} editLabel="Edit profile" />
      </div>

      <div className="mt-3 flex items-center gap-4">
        <Avatar name={profile.full_name || "You"} src={profile.avatar_url} size={64} />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-display font-bold leading-tight">
            {profile.full_name || "Your name"}
          </h1>
          <p className="text-sm text-muted">
            {[player.primary_position, player.grad_year && `Class of ${player.grad_year}`]
              .filter(Boolean)
              .join(" · ") || "Add your position & class"}
          </p>
          {(player.city || player.state) && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
              <MapPin size={13} strokeWidth={2} aria-hidden />
              {[player.city, player.state].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      </div>

      {player.is_transfer && (
        <div className="mt-3">
          <Chip tone="status-interested">
            Transfer{player.current_school ? ` · ${player.current_school}` : ""}
          </Chip>
        </div>
      )}
    </>
  );
}

/* ------------------------------ Data tab -------------------------------- */

function DataTab({ player }: { player: Player }) {
  const pct = Math.round(profileCompleteness(player) * 100);

  const prefStates = player.pref_states ?? [];
  const prefDivisions = player.pref_divisions ?? [];
  const location = prefStates.length
    ? prefStates.join(", ")
    : player.pref_climate && player.pref_climate !== "any"
      ? `${climateLabel(player.pref_climate)} climate`
      : "Anywhere";

  return (
    <div>
      {/* About */}
      <div>
        <h2 className="eyebrow mb-2">About</h2>
        {player.bio ? (
          <p className="text-[15px] leading-relaxed text-body-2">{player.bio}</p>
        ) : (
          <p className="text-sm text-muted-2">
            Add a short bio in Edit — coaches read this first.
          </p>
        )}
      </div>

      <StatBlock player={player} className="mt-5" />

      {/* Positions */}
      <Section title="Positions">
        <div className="flex flex-wrap gap-2">
          {(player.positions ?? []).map((p) => (
            <Chip key={p} tone={p === player.primary_position ? "accent" : "neutral"}>
              {p === player.primary_position ? `★ ${p}` : p}
            </Chip>
          ))}
          {(player.positions ?? []).length === 0 && (
            <span className="text-sm text-muted-2">No positions yet</span>
          )}
        </div>
      </Section>

      {/* Interested in */}
      <Section title="Interested in">
        <div className="divide-y divide-divider rounded-card border border-border bg-surface">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-eyebrow text-muted-2">
              Levels
            </span>
            {prefDivisions.length ? (
              <div className="flex flex-wrap justify-end gap-1.5">
                {prefDivisions.map((d) => (
                  <Chip key={d} tone="accent" size="sm">
                    {d}
                  </Chip>
                ))}
              </div>
            ) : (
              <span className="text-sm font-medium text-ink">Any level</span>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-eyebrow text-muted-2">
              Location
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <MapPin size={14} strokeWidth={2} aria-hidden className="text-muted-2" />
              {location}
            </span>
          </div>
        </div>
      </Section>

      {pct < 100 && (
        <Card className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-ink">Profile strength</span>
            <span className="tabular-nums text-muted">{pct}%</span>
          </div>
          <ProgressBar value={pct} />
          <p className="text-xs text-body-2">
            A complete profile ranks higher in coaches&rsquo; inboxes.
          </p>
        </Card>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="eyebrow mb-2">{title}</h2>
      {children}
    </section>
  );
}

/* ------------------------------- Edit ----------------------------------- */

function EditForm({
  profile,
  player,
  onDone,
}: {
  profile: Profile;
  player: Player;
  onDone: () => void;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [name, setName] = useState(profile.full_name ?? "");
  const [picked, setPicked] = useState<string[]>(
    player.primary_position
      ? [
          player.primary_position,
          ...(player.positions ?? []).filter((p) => p !== player.primary_position),
        ]
      : (player.positions ?? [])
  );
  const [gradYear, setGradYear] = useState(player.grad_year?.toString() ?? "");
  const [gpa, setGpa] = useState(player.gpa?.toString() ?? "");
  const [city, setCity] = useState(player.city ?? "");
  const [state, setState] = useState(player.state ?? "");
  const [bats, setBats] = useState(player.bats ?? "");
  const [throws, setThrows] = useState(player.throws ?? "");
  const [heightFt, setHeightFt] = useState(
    player.height_in != null ? Math.floor(player.height_in / 12).toString() : ""
  );
  const [heightIn, setHeightIn] = useState(
    player.height_in != null ? (player.height_in % 12).toString() : ""
  );
  const [weight, setWeight] = useState(player.weight_lb?.toString() ?? "");
  const [sixty, setSixty] = useState(player.sixty_yd?.toString() ?? "");
  const [exitVelo, setExitVelo] = useState(player.exit_velo?.toString() ?? "");
  const [throwVelo, setThrowVelo] = useState(
    (player.of_velo ?? player.inf_velo)?.toString() ?? ""
  );
  const [fastball, setFastball] = useState(player.fastball_velo?.toString() ?? "");
  const [popTime, setPopTime] = useState(player.pop_time?.toString() ?? "");
  const [isTransfer, setIsTransfer] = useState(player.is_transfer);
  const [currentSchool, setCurrentSchool] = useState(player.current_school ?? "");
  const [bio, setBio] = useState(player.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [prefDivisions, setPrefDivisions] = useState<string[]>(
    player.pref_divisions ?? []
  );
  const [prefStates, setPrefStates] = useState<string[]>(
    player.pref_states ?? []
  );
  const [prefClimate, setPrefClimate] = useState(player.pref_climate ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function onAvatarPick(file: File | null) {
    if (!file) return;
    setError("");
    if (file.size > 10 * 1024 * 1024) {
      setError("Photo is over 10MB — try a smaller image.");
      return;
    }
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${profile.id}/avatar/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("player-media")
      .upload(path, file, { upsert: true });
    if (upErr) {
      setUploadingAvatar(false);
      setError(upErr.message);
      return;
    }
    const url = supabase.storage.from("player-media").getPublicUrl(path).data
      .publicUrl;
    setAvatarUrl(url);
    setUploadingAvatar(false);
  }

  function toggleDivision(d: string) {
    setPrefDivisions((cur) =>
      cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]
    );
  }
  function toggleState(s: string) {
    setPrefStates((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]
    );
  }

  const primary = picked[0] ?? null;
  const num = (v: string) => (v === "" ? null : Number(v));

  function togglePos(pos: string) {
    setPicked((cur) =>
      cur.includes(pos) ? cur.filter((p) => p !== pos) : [...cur, pos]
    );
  }

  async function save() {
    setError("");
    setSaving(true);
    const totalHeight =
      heightFt || heightIn
        ? Number(heightFt || 0) * 12 + Number(heightIn || 0)
        : null;

    const { error: pErr } = await supabase
      .from("profiles")
      .update({ full_name: name.trim(), avatar_url: avatarUrl || null })
      .eq("id", profile.id);

    const { error: plErr } = await supabase
      .from("players")
      .update({
        grad_year: gradYear ? Number(gradYear) : null,
        primary_position: primary,
        positions: picked,
        bats: bats || null,
        throws: throws || null,
        height_in: totalHeight,
        weight_lb: num(weight),
        gpa: num(gpa),
        city: city.trim() || null,
        state: state || null,
        is_transfer: isTransfer,
        current_school: isTransfer ? currentSchool.trim() || null : null,
        sixty_yd: num(sixty),
        exit_velo: isPitcher(primary) ? null : num(exitVelo),
        inf_velo:
          !isPitcher(primary) && !isCatcher(primary) && !isOutfielder(primary)
            ? num(throwVelo)
            : null,
        of_velo: isOutfielder(primary) ? num(throwVelo) : null,
        fastball_velo: isPitcher(primary) ? num(fastball) : null,
        pop_time: isCatcher(primary) ? num(popTime) : null,
        bio: bio.trim() || null,
        pref_divisions: prefDivisions,
        pref_states: prefStates,
        pref_climate: prefClimate || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    setSaving(false);
    if (pErr || plErr) {
      setError((pErr ?? plErr)?.message ?? "Couldn't save. Try again.");
      return;
    }
    router.refresh();
    onDone();
  }

  const years = (() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => now + i - 1);
  })();

  return (
    <main className="px-5 pt-12 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold tracking-tight">
          Edit profile
        </h1>
        <button onClick={onDone} className="text-muted" aria-label="Cancel">
          <X size={22} strokeWidth={2} />
        </button>
      </div>

      <div className="mt-6 space-y-5">
        {/* Profile photo */}
        <div className="flex items-center gap-4">
          <Avatar name={name || "You"} src={avatarUrl || null} size={72} />
          <div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-btn border border-border bg-surface px-3 py-2 text-sm font-semibold text-ink">
              <Camera size={16} strokeWidth={2} aria-hidden />
              {uploadingAvatar
                ? "Uploading…"
                : avatarUrl
                  ? "Change photo"
                  : "Add photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onAvatarPick(e.target.files?.[0] ?? null)}
              />
            </label>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl("")}
                className="ml-3 text-sm font-semibold text-danger"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        <Field label="Full name" htmlFor="pn">
          <Input id="pn" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <Field label="Positions" hint="First pick is your primary (★).">
          <div className="flex flex-wrap gap-2">
            {POSITIONS.map((pos) => {
              const active = picked.includes(pos);
              return (
                <button
                  key={pos}
                  type="button"
                  onClick={() => togglePos(pos)}
                  className={cn(
                    "h-9 rounded-pill px-3.5 text-sm font-semibold transition-colors",
                    active
                      ? "bg-accent text-surface"
                      : "bg-chip text-body-2 hover:bg-accent-soft"
                  )}
                >
                  {primary === pos ? `★ ${pos}` : pos}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Grad year" htmlFor="gy">
            <Select id="gy" value={gradYear} onChange={(e) => setGradYear(e.target.value)}>
              <option value="">Select</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="GPA" htmlFor="gp">
            <Input
              id="gp"
              type="number"
              step="0.01"
              min="0"
              max="4"
              inputMode="decimal"
              value={gpa}
              onChange={(e) => setGpa(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="City" htmlFor="ci">
            <Input id="ci" value={city} onChange={(e) => setCity(e.target.value)} />
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
          <Field label="Bats" htmlFor="ba">
            <Select id="ba" value={bats} onChange={(e) => setBats(e.target.value)}>
              <option value="">—</option>
              {BATS.map((b) => (
                <option key={b} value={b}>
                  {b === "S" ? "Switch" : b === "R" ? "Right" : "Left"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Throws" htmlFor="th">
            <Select id="th" value={throws} onChange={(e) => setThrows(e.target.value)}>
              <option value="">—</option>
              {THROWS.map((t) => (
                <option key={t} value={t}>
                  {t === "R" ? "Right" : "Left"}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Height" htmlFor="hf">
            <div className="flex gap-2">
              <Input
                id="hf"
                type="number"
                inputMode="numeric"
                placeholder="6"
                value={heightFt}
                onChange={(e) => setHeightFt(e.target.value)}
                aria-label="Feet"
              />
              <Input
                type="number"
                inputMode="numeric"
                placeholder="1"
                value={heightIn}
                onChange={(e) => setHeightIn(e.target.value)}
                aria-label="Inches"
              />
            </div>
          </Field>
          <Field label="Weight" htmlFor="we">
            <Input
              id="we"
              type="number"
              inputMode="numeric"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </Field>
          <Field label="60 time" htmlFor="sx">
            <Input
              id="sx"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={sixty}
              onChange={(e) => setSixty(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {isPitcher(primary) ? (
            <Field label="Fastball velo" htmlFor="fb">
              <Input
                id="fb"
                type="number"
                inputMode="numeric"
                value={fastball}
                onChange={(e) => setFastball(e.target.value)}
              />
            </Field>
          ) : (
            <Field label="Exit velo" htmlFor="ev">
              <Input
                id="ev"
                type="number"
                inputMode="numeric"
                value={exitVelo}
                onChange={(e) => setExitVelo(e.target.value)}
              />
            </Field>
          )}
          {isCatcher(primary) ? (
            <Field label="Pop time" htmlFor="pt">
              <Input
                id="pt"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={popTime}
                onChange={(e) => setPopTime(e.target.value)}
              />
            </Field>
          ) : !isPitcher(primary) ? (
            <Field
              label={isOutfielder(primary) ? "OF velo" : "INF velo"}
              htmlFor="tv"
            >
              <Input
                id="tv"
                type="number"
                inputMode="numeric"
                value={throwVelo}
                onChange={(e) => setThrowVelo(e.target.value)}
              />
            </Field>
          ) : (
            <span />
          )}
        </div>

        <label className="flex items-center gap-3 rounded-input border border-border bg-surface p-3">
          <input
            type="checkbox"
            checked={isTransfer}
            onChange={(e) => setIsTransfer(e.target.checked)}
            className="h-5 w-5 accent-accent"
          />
          <span className="text-[15px] text-ink">I&rsquo;m a transfer</span>
        </label>
        {isTransfer && (
          <Field label="Current school" htmlFor="cs">
            <Input
              id="cs"
              value={currentSchool}
              onChange={(e) => setCurrentSchool(e.target.value)}
            />
          </Field>
        )}

        {/* Recruiting preferences — filter the Fits feed */}
        <div className="rounded-input border border-border bg-surface p-4 space-y-4">
          <p className="eyebrow">Interested in</p>

          <Field label="Levels" hint="Only show spots at these levels. None = all.">
            <div className="flex flex-wrap gap-2">
              {DIVISIONS.map((d) => {
                const active = prefDivisions.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDivision(d)}
                    className={cn(
                      "h-9 rounded-pill px-4 text-sm font-semibold transition-colors",
                      active
                        ? "bg-accent text-surface"
                        : "bg-chip text-body-2 hover:bg-accent-soft"
                    )}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field
            label="Climate"
            hint="Prefer a region's weather. Ignored if you pick states below."
            htmlFor="clim"
          >
            <Select
              id="clim"
              value={prefClimate}
              onChange={(e) => setPrefClimate(e.target.value)}
            >
              <option value="">Anywhere</option>
              {CLIMATES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="States" hint="Tap the states you'd go to. None = anywhere.">
            <div className="flex flex-wrap gap-1.5">
              {STATES.map((s) => {
                const active = prefStates.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleState(s)}
                    className={cn(
                      "h-8 rounded-pill px-2.5 text-xs font-semibold transition-colors",
                      active
                        ? "bg-accent text-surface"
                        : "bg-chip text-body-2 hover:bg-accent-soft"
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <Field label="About you">
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={280}
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
