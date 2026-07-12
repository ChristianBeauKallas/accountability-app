import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ActivitiesManager from "./activities-manager";
import GroupNameEditor from "./group-name-editor";
import InviteLink from "./invite-link";
import DeleteAccount from "./delete-account";
import Tour from "../tour";
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

  const [{ data }, { data: profile }] = await Promise.all([
    supabase
      .from("activities")
      .select("*")
      .eq("group_id", membership.group_id)
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const activities = (data ?? []) as Activity[];

  return (
    <main className="board settings-page">
      <header className="board-head">
        <div>
          <h1>Settings</h1>
          <p className="subtitle">
            <Link href="/">‹ {membership.groups.name}</Link>
          </p>
        </div>
      </header>

      {/* Invite — available to every member */}
      <section className="settings-card">
        <h2 className="settings-title">Invite your crew</h2>
        <InviteLink
          code={membership.groups.invite_code}
          groupName={membership.groups.name}
        />
      </section>

      {/* Group name + activities — owner edits, members view */}
      {isOwner ? (
        <>
          <section className="settings-card">
            <h2 className="settings-title">Group name</h2>
            <GroupNameEditor
              groupId={membership.group_id}
              initial={membership.groups.name}
            />
          </section>
          <section className="settings-card">
            <h2 className="settings-title">Daily activities</h2>
            <ActivitiesManager
              groupId={membership.group_id}
              initial={activities}
            />
          </section>
        </>
      ) : (
        <section className="settings-card">
          <h2 className="settings-title">Daily activities</h2>
          <p className="settings-hint">
            Your group&apos;s daily activities. Only the owner can change these.
          </p>
          <ul className="settings-activity-list">
            {activities.map((a) => (
              <li key={a.id}>
                <span className="settings-activity-emoji">{a.emoji ?? "✅"}</span>
                <span>{a.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Walkthrough — everyone */}
      <section className="settings-card">
        <h2 className="settings-title">How it works</h2>
        <p className="settings-hint">
          New here, or want a refresher? Take the quick walkthrough again.
        </p>
        <Tour
          userId={user.id}
          groupName={membership.groups.name}
          displayName={profile?.display_name ?? "there"}
          avatarUrl={profile?.avatar_url ?? null}
          inviteCode={membership.groups.invite_code}
          autoOpen={false}
          trigger="button"
        />
      </section>

      {/* Account — everyone */}
      <section className="settings-card danger">
        <DeleteAccount ownsGroup={isOwner} />
      </section>
    </main>
  );
}
