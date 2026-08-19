import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import GroupNameEditor from "./group-name-editor";
import MembersManager from "./members-manager";
import InviteLink from "./invite-link";
import DeleteAccount from "./delete-account";
import CoachingCard from "./coaching-card";
import Tour from "../tour";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  // Coaching: group members (for the "coach a teammate" picker), who I coach,
  // and whether I'm being coached.
  const [membersRes, myClientsRes, amClientRes] = await Promise.all([
    supabase
      .from("group_members")
      .select("user_id, role, profiles(display_name, avatar_url)")
      .eq("group_id", membership.group_id),
    supabase
      .from("coaching_relationships")
      .select("client_id")
      .eq("coach_id", user.id),
    supabase
      .from("coaching_relationships")
      .select("id, coach_id")
      .eq("client_id", user.id),
  ]);
  const allMembers = (membersRes.data ?? []) as unknown as {
    user_id: string;
    role: string;
    profiles: { display_name: string; avatar_url: string | null } | null;
  }[];
  const memberList = allMembers
    .filter((m) => m.user_id !== user.id)
    .map((m) => ({ id: m.user_id, name: m.profiles?.display_name ?? "Member" }));
  // Full roster for the owner's member manager.
  const groupMembers = allMembers
    .map((m) => ({
      id: m.user_id,
      name: m.profiles?.display_name ?? "Member",
      avatar: m.profiles?.avatar_url ?? null,
      role: m.role,
    }))
    .sort((a, b) =>
      a.role === "owner" ? -1 : b.role === "owner" ? 1 : a.name.localeCompare(b.name),
    );
  const clientIds = new Set(
    (myClientsRes.data ?? []).map((r) => r.client_id as string),
  );
  const clientList = memberList.filter((m) => clientIds.has(m.id));
  const myClientRels = (amClientRes.data ?? []) as {
    id: string;
    coach_id: string;
  }[];
  const isClient = myClientRels.length > 0;

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

      {/* Group name — owner edits */}
      {isOwner && (
        <section className="settings-card">
          <h2 className="settings-title">Group name</h2>
          <GroupNameEditor
            groupId={membership.group_id}
            initial={membership.groups.name}
          />
        </section>
      )}

      {/* Members — owner sees everyone and can remove people */}
      {isOwner && (
        <section className="settings-card">
          <h2 className="settings-title">Members</h2>
          <p className="settings-hint">
            Everyone in {membership.groups.name}. Removing someone takes them off
            the roster and feed — they can rejoin with the invite link.
          </p>
          <MembersManager
            groupId={membership.group_id}
            ownerId={user.id}
            members={groupMembers}
          />
        </section>
      )}

      {/* Coaching — 1:1 */}
      <section className="settings-card">
        <h2 className="settings-title">Coaching</h2>
        <p className="settings-hint">
          Run a private 1:1 program — the person you coach logs their day, you
          see it and leave notes. Separate from the group.
        </p>
        <CoachingCard
          userId={user.id}
          members={memberList}
          clients={clientList}
          isClient={isClient}
        />
      </section>

      {/* Walkthrough — everyone */}
      <section className="settings-card">
        <h2 className="settings-title">How it works</h2>
        <p className="settings-hint">
          Want a refresher? This replays the welcome tour and brings back the
          posting, profile, and chat walkthroughs as you revisit each screen.
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
