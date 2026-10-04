"use client";

import { useMemo, useState } from "react";
import {
  MapPin,
  Star,
  X,
  Check,
  Inbox as InboxIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { PlayerFeed } from "@/components/player/PlayerFeed";
import { STATUS_LABEL, STATUS_TONE, timeAgo, metricChips, formatHeight } from "@/lib/format";
import type {
  Application,
  ApplicationStatus,
  Need,
  Player,
  Profile,
} from "@/lib/types";

export type InboxRow = Application & {
  player: (Player & { profile: Pick<Profile, "full_name" | "avatar_url"> }) | null;
  need: Need | null;
};

type Filter = "all" | "new" | "interested";

export function InboxView({ rows: initialRows }: { rows: InboxRow[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState(initialRows);
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const newCount = rows.filter((r) => r.status === "new").length;
  const interestedCount = rows.filter((r) => r.status === "interested").length;

  const visible = useMemo(
    () =>
      rows.filter((r) => {
        if (filter === "new") return r.status === "new";
        if (filter === "interested") return r.status === "interested";
        return r.status !== "closed";
      }),
    [rows, filter]
  );

  function patch(id: string, changes: Partial<InboxRow>) {
    setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...changes } : r)));
  }

  async function openApp(row: InboxRow) {
    setOpenId(row.id);
    if (row.status === "new") {
      patch(row.id, { status: "viewed", viewed_at: new Date().toISOString() });
      await supabase
        .from("applications")
        .update({ status: "viewed", viewed_at: new Date().toISOString() })
        .eq("id", row.id)
        .eq("status", "new");
    }
  }

  async function setStatus(row: InboxRow, status: ApplicationStatus) {
    patch(row.id, { status });
    await supabase.from("applications").update({ status }).eq("id", row.id);
  }

  const openRow = rows.find((r) => r.id === openId) ?? null;

  return (
    <div className="space-y-4">
      <SegmentedControl
        value={filter}
        onChange={setFilter}
        segments={[
          { value: "all", label: "All" },
          { value: "new", label: newCount ? `New ${newCount}` : "New" },
          {
            value: "interested",
            label: interestedCount ? `★ ${interestedCount}` : "Interested",
          },
        ]}
      />

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border bg-surface px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-pill bg-accent-soft text-accent">
            <InboxIcon size={22} strokeWidth={2} aria-hidden />
          </span>
          <p className="font-display text-lg font-semibold text-ink">
            {filter === "new" ? "No new applicants" : "Nothing here yet"}
          </p>
          <p className="max-w-xs text-sm text-body-2">
            Post a need and qualified players will show up here, ranked by fit.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((row) => (
            <li key={row.id}>
              <ApplicantCard row={row} onOpen={() => openApp(row)} />
            </li>
          ))}
        </ul>
      )}

      {openRow && (
        <ApplicantSheet
          row={openRow}
          onClose={() => setOpenId(null)}
          onInterested={() => setStatus(openRow, "interested")}
          onPass={() => setStatus(openRow, "closed")}
        />
      )}
    </div>
  );
}

function ApplicantCard({
  row,
  onOpen,
}: {
  row: InboxRow;
  onOpen: () => void;
}) {
  const p = row.player;
  const name = p?.profile.full_name || "Player";
  return (
    <Card
      interactive
      onClick={onOpen}
      className={cn(row.status === "new" && "ring-1 ring-accent/40")}
    >
      <div className="flex items-start gap-3">
        <Avatar name={name} src={p?.profile.avatar_url} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-base font-semibold leading-tight">
              {name}
            </h3>
            {row.status === "new" && (
              <span className="h-2 w-2 shrink-0 rounded-pill bg-accent" />
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted">
            {[p?.primary_position, p?.grad_year && `'${String(p.grad_year).slice(2)}`]
              .filter(Boolean)
              .join(" · ")}
            {p?.state ? ` · ${p.state}` : ""}
          </p>
          <p className="mt-1 truncate text-xs text-muted-2">
            {row.need?.title ?? "Roster need"} · applied {timeAgo(row.created_at)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="flex items-center justify-end gap-0.5 text-accent">
            <Star size={13} strokeWidth={2} aria-hidden />
            <span className="font-display text-xl font-bold tabular-nums">
              {row.fit_score ?? "—"}
            </span>
          </div>
          <div className="mt-1">
            <Chip tone={STATUS_TONE[row.status] as "status-new"} size="sm">
              {STATUS_LABEL[row.status]}
            </Chip>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ApplicantSheet({
  row,
  onClose,
  onInterested,
  onPass,
}: {
  row: InboxRow;
  onClose: () => void;
  onInterested: () => void;
  onPass: () => void;
}) {
  const p = row.player;
  const name = p?.profile.full_name || "Player";
  const metrics = p ? metricChips(p) : [];
  const height = formatHeight(p?.height_in ?? null);
  const [tab, setTab] = useState<"profile" | "updates" | "highlights">(
    "profile"
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-ink/40">
      <button className="flex-1" onClick={onClose} aria-label="Close" />
      <div className="mx-auto w-full max-w-app rounded-t-[20px] bg-ground max-h-[86dvh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between border-b border-divider bg-ground/95 px-5 py-3 backdrop-blur">
          <span className="eyebrow">Applicant</span>
          <button onClick={onClose} className="text-muted" aria-label="Close">
            <X size={22} strokeWidth={2} />
          </button>
        </div>

        <div className="px-5 pb-28 pt-4">
          <div className="flex items-center gap-4">
            <Avatar name={name} src={p?.profile.avatar_url} size={60} />
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-display font-bold leading-tight">
                {name}
              </h2>
              <p className="text-sm text-muted">
                {[p?.primary_position, p?.grad_year && `Class of ${p.grad_year}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {(p?.city || p?.state) && (
                <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
                  <MapPin size={13} strokeWidth={2} aria-hidden />
                  {[p?.city, p?.state].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Chip tone="accent">
              <Star size={12} strokeWidth={2.5} aria-hidden /> {row.fit_score ?? "—"} fit
            </Chip>
            <Chip tone={STATUS_TONE[row.status] as "status-new"}>
              {STATUS_LABEL[row.status]}
            </Chip>
            {p?.is_transfer && <Chip tone="status-interested">Transfer</Chip>}
          </div>

          <SegmentedControl
            className="mt-4"
            value={tab}
            onChange={setTab}
            segments={[
              { value: "profile", label: "Profile" },
              { value: "updates", label: "Updates" },
              { value: "highlights", label: "Highlights" },
            ]}
          />

          <div className="mt-5">
            {tab === "profile" && (
              <>
                <Section title="Applying to">
                  <p className="text-[15px] font-semibold text-ink">
                    {row.need?.title ?? "Roster need"}
                  </p>
                </Section>

                <Section title="Positions">
                  <div className="flex flex-wrap gap-2">
                    {(p?.positions ?? []).map((pos) => (
                      <Chip
                        key={pos}
                        tone={pos === p?.primary_position ? "accent" : "neutral"}
                      >
                        {pos === p?.primary_position ? `★ ${pos}` : pos}
                      </Chip>
                    ))}
                  </div>
                </Section>

                <Section title="Measurables">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <Stat
                      label="Bats / Throws"
                      value={`${p?.bats ?? "—"} / ${p?.throws ?? "—"}`}
                    />
                    <Stat
                      label="Height / Weight"
                      value={
                        [height, p?.weight_lb ? `${p.weight_lb} lb` : null]
                          .filter(Boolean)
                          .join(" · ") || "—"
                      }
                    />
                    <Stat label="GPA" value={p?.gpa != null ? p.gpa.toFixed(2) : "—"} />
                  </dl>
                  {metrics.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {metrics.map((m) => (
                        <Chip key={m} tone="metric">
                          {m}
                        </Chip>
                      ))}
                    </div>
                  )}
                </Section>

                {p?.bio && (
                  <Section title="About">
                    <p className="text-[15px] leading-relaxed text-body-2">
                      {p.bio}
                    </p>
                  </Section>
                )}
              </>
            )}

            {tab === "updates" && p && (
              <PlayerFeed playerId={p.id} kind="update" editable={false} />
            )}
            {tab === "highlights" && p && (
              <PlayerFeed playerId={p.id} kind="highlight" editable={false} />
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="fixed bottom-0 left-1/2 w-full max-w-app -translate-x-1/2 border-t border-divider bg-surface px-5 py-3">
          <div className="flex gap-3">
            <Button
              variant="danger"
              full
              onClick={() => {
                onPass();
                onClose();
              }}
            >
              Pass
            </Button>
            <Button
              full
              onClick={() => {
                onInterested();
                onClose();
              }}
            >
              <Check size={18} strokeWidth={2.5} aria-hidden />
              Interested
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="eyebrow mb-2">{title}</h3>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-2">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
