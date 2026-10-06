import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { InboxView, type InboxRow } from "@/components/coach/InboxView";
import { HeaderActions } from "@/components/HeaderActions";
import { WelcomeTour } from "@/components/tour/WelcomeTour";
import { COACH_TOUR } from "@/components/tour/steps";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const { profile } = await requireProfile("coach");
  const supabase = createClient();

  // RLS scopes these to applications for the coach's program needs.
  const { data } = await supabase
    .from("applications")
    .select(
      "*, player:players(*, profile:profiles(full_name, avatar_url)), need:needs(*)"
    )
    .order("fit_score", { ascending: false });

  const rows = (data ?? []) as unknown as InboxRow[];
  const newCount = rows.filter((r) => r.status === "new").length;
  const first = profile.full_name?.split(" ")[0] || "Coach";

  return (
    <main className="px-5 pt-12">
      <div className="flex items-start justify-between">
        <p className="eyebrow">Hey {first}</p>
        <HeaderActions />
      </div>
      <h1 className="mt-1 text-3xl font-display font-bold tracking-tight">
        Inbox
      </h1>
      <p className="mt-1 mb-5 text-[15px] text-body-2">
        {rows.length > 0
          ? `${rows.length} ${rows.length === 1 ? "player wants" : "players want"} in${newCount ? ` · ${newCount} new` : ""} — best fit first.`
          : "Players who want your spots show up here, best fit first."}
      </p>
      <InboxView rows={rows} />
      <WelcomeTour steps={COACH_TOUR} storageKey="athletx-tour-coach" />
    </main>
  );
}
