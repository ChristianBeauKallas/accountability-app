import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Message } from "@/lib/types";
import ChatRoom from "./chat-room";

export const dynamic = "force-dynamic";

type MemberRow = {
  user_id: string;
  profiles: { display_name: string; avatar_url: string | null } | null;
};

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, groups(name)")
    .eq("user_id", user.id);
  const membership = memberships?.[0] as
    | { group_id: string; groups: { name: string } }
    | undefined;

  if (!membership) {
    return (
      <main className="board">
        <div className="notice">Join a group first to chat.</div>
      </main>
    );
  }

  const groupId = membership.group_id;

  const [membersRes, messagesRes] = await Promise.all([
    supabase
      .from("group_members")
      .select("user_id, profiles(display_name, avatar_url)")
      .eq("group_id", groupId),
    supabase
      .from("messages")
      .select("id, group_id, author_id, body, created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true })
      .limit(200),
  ]);

  const memberRows = (membersRes.data ?? []) as unknown as MemberRow[];
  const members: Record<string, { name: string; avatar: string | null }> = {};
  for (const m of memberRows) {
    members[m.user_id] = {
      name: m.profiles?.display_name ?? "Member",
      avatar: m.profiles?.avatar_url ?? null,
    };
  }

  const messages = (messagesRes.data ?? []) as Message[];

  return (
    <main className="board chat-page">
      <header className="board-head">
        <div>
          <h1>Chat</h1>
          <p className="subtitle">
            <Link href="/">‹ {membership.groups.name}</Link>
          </p>
        </div>
      </header>

      <ChatRoom
        groupId={groupId}
        userId={user.id}
        initial={messages}
        members={members}
      />
    </main>
  );
}
