import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/wellness-server";
import {
  formatHours,
  formatMoney,
  initials,
  qualifyingDaysByMember,
} from "@/lib/wellness";
import { ExportButton } from "@/components/wellness/ExportButton";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  if (!viewer.member.is_admin) redirect("/feed");
  const { program } = viewer;
  const supabase = createClient();

  const now = new Date();
  const startMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();

  const { data: membersRaw } = await supabase
    .from("wl_members")
    .select("id, name, avatar_url")
    .eq("program_id", program.id);
  const members = (membersRaw ?? []) as { id: string; name: string; avatar_url: string | null }[];

  const { data: checkRaw } = await supabase
    .from("wl_checkins")
    .select("member_id, created_at, duration_minutes")
    .eq("program_id", program.id)
    .gte("created_at", startMonth);
  const byMember = qualifyingDaysByMember(checkRaw ?? [], program, now);

  const roster = members
    .map((m) => {
      const days = byMember.get(m.id) ?? 0;
      return { ...m, days, qualified: days >= program.days_goal };
    })
    .sort((a, b) => b.days - a.days);

  const qualified = roster.filter((r) => r.qualified).length;
  const payoutCents = qualified * program.monthly_bonus_cents;
  const monthName = now.toLocaleString("en-US", { month: "long" });
  const bonusLabel = formatMoney(program.monthly_bonus_cents);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-[18px] pb-2.5 pt-safe">
        <Link
          href="/me"
          className="rounded-btn border border-border bg-surface px-2.5 py-[7px] text-sm font-semibold text-ink"
        >
          Back
        </Link>
        <div className="text-center">
          <h1 className="font-display text-base font-bold text-ink">{monthName} review</h1>
          <div className="text-[0.72rem] text-muted">{program.name}</div>
        </div>
        <ExportButton
          rows={roster.map((r) => ({ name: r.name, days: r.days, qualified: r.qualified }))}
          goal={program.days_goal}
          bonusLabel={bonusLabel}
          month={monthName}
        />
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3.5 p-[18px]">
          <div className="grid grid-cols-3 gap-2.5">
            <Summary value={String(roster.length)} label="team members" />
            <Summary value={String(qualified)} label="qualified" accent />
            <Summary value={formatMoney(payoutCents)} label="to pay out" gold />
          </div>

          <p className="px-0.5 text-[0.72rem] leading-snug text-muted">
            Everyone who reaches {program.days_goal} days earns{" "}
            {formatHours(program.bank_hours_per_month)} wellness hours + {bonusLabel}. Review and
            lock totals at month-end.
          </p>

          <div className="px-0.5 font-display text-[0.78rem] font-bold uppercase tracking-wide text-muted">
            Standing today
          </div>

          <div className="rounded-card border border-border bg-surface px-3.5 py-1 shadow-card">
            {roster.map((r, i) => (
              <div
                key={r.id}
                className={`flex items-center gap-3 py-[11px] ${i < roster.length - 1 ? "border-b border-border" : ""}`}
              >
                <span className="grid h-[34px] w-[34px] flex-none place-items-center overflow-hidden rounded-full bg-accent-soft font-display text-[0.72rem] font-bold text-accent">
                  {r.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(r.name)
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[0.85rem] font-semibold text-ink">{r.name}</div>
                  <div className="text-[0.72rem] text-muted">
                    {r.days} of {program.days_goal} days
                  </div>
                </div>
                <div className="text-right">
                  {r.qualified ? (
                    <span className="rounded-pill bg-accent-soft px-2.5 py-[3px] text-[0.64rem] font-bold text-accent">
                      QUALIFIED
                    </span>
                  ) : (
                    <span className="rounded-pill bg-chip px-2.5 py-[3px] text-[0.64rem] font-bold text-muted">
                      {program.days_goal - r.days} to go
                    </span>
                  )}
                  <div className="ml-auto mt-1.5 h-[5px] w-[54px] overflow-hidden rounded-pill bg-track">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${Math.min(100, Math.round((r.days / program.days_goal) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Summary({
  value,
  label,
  accent,
  gold,
}: {
  value: string;
  label: string;
  accent?: boolean;
  gold?: boolean;
}) {
  return (
    <div className="rounded-[14px] border border-border bg-surface p-3 text-center shadow-card">
      <b
        className={`block font-display text-[1.3rem] font-bold leading-tight ${accent ? "text-accent" : gold ? "text-gold" : "text-ink"}`}
      >
        {value}
      </b>
      <span className="text-[0.66rem] font-semibold text-muted">{label}</span>
    </div>
  );
}
