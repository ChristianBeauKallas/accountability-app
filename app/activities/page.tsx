import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ActivitiesManager from "./activities-manager";
import GroupNameEditor from "./group-name-editor";
import InviteLink from "./invite-link";
import DeleteAccount from "./delete-account";
import type { Activity } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, role, groups(name, invite_code)")
    .eq("user_id", user.id);

  const membership = memberships?.[0] as
    | {
        group_id: string;
        role: string;
        groups: { name: string; invite_code: string };
      }
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
          <h1>Settings</h1>
          <p className="subtitle">
            <Link href="/">‹ {membership.groups.name}</Link>
          </p>
        </div>
      </header>

      {/* Invite — available to every member */}
      <InviteLink
        code={membership.groups.invite_code}
        groupName={membership.groups.name}
      />

      {isOwner ? (
        <>
          <GroupNameEditor
            groupId={membership.group_id}
            initial={membership.groups.name}
          />
          <ActivitiesManager groupId={membership.group_id} initial={activities} />
        </>
      ) : (
        <div className="notice">
          Your group&apos;s daily activities (only the owner can change these):
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

      <DeleteAccount ownsGroup={isOwner} />
    </main>
  );
}
