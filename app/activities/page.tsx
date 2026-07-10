import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ActivitiesManager from "./activities-manager";
import type { Activity } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, role, groups(name)")
    .eq("user_id", user.id);

  const membership = memberships?.[0] as
    | { group_id: string; role: string; groups: { name: string } }
    | undefined;

  if (!membership) return null;

  const isOwner = membership.role === "owner";

  const { data } = await supabase
    .from("activities")
    .select("*")
    .eq("group_id", membership.group_id)
    .eq("active", true)
    .order("sort_order");

  const activities = (data ?? []) as Activity[];

  return (
    <main className="board">
      <header className="board-head">
        <div>
          <h1>Activities</h1>
          <p className="subtitle">
            <Link href="/">‹ {membership.groups.name}</Link>
          </p>
        </div>
      </header>

      {isOwner ? (
        <ActivitiesManager
          groupId={membership.group_id}
          initial={activities}
        />
      ) : (
        <div className="notice">
          These are your group&apos;s daily activities. Only the group owner can
          change them.
          <ul className="roster" style={{ marginTop: "1rem" }}>
            {activities.map((a) => (
              <li key={a.id} className="roster-row">
                <span className="toggle-emoji">{a.emoji ?? "✅"}</span>
                <span className="roster-name">{a.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
