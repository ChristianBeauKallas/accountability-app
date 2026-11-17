import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/wellness-server";
import { JoinForm } from "./JoinForm";

export const dynamic = "force-dynamic";

export default async function JoinPage({ params }: { params: { code: string } }) {
  const viewer = await getViewer();
  if (viewer) redirect("/feed");

  const supabase = createClient();
  const { data } = await supabase.rpc("wl_program_by_code", { p_code: params.code });
  const program =
    Array.isArray(data) && data[0]
      ? (data[0] as {
          id: string;
          name: string;
          days_goal: number;
          mins_per_day: number;
          bank_hours_per_month: number;
          monthly_bonus_cents: number;
        })
      : null;

  if (!program) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
        <h1 className="font-display text-2xl font-bold text-ink">Invite not found</h1>
        <p className="text-sm text-body-2">
          This invite link isn&apos;t valid. Ask your admin for a fresh one.
        </p>
        <Link href="/" className="font-semibold text-accent">
          Back to start
        </Link>
      </main>
    );
  }

  return (
    <JoinForm
      programId={program.id}
      programName={program.name}
      daysGoal={program.days_goal}
      minsPerDay={program.mins_per_day}
      bankHours={program.bank_hours_per_month}
      bonusCents={program.monthly_bonus_cents}
    />
  );
}
