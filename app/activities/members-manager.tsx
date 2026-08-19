"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "../avatar";

type Member = {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
};

// Settings › Members (owner only): see everyone in the group and remove people.
export default function MembersManager({
  groupId,
  ownerId,
  members,
}: {
  groupId: string;
  ownerId: string;
  members: Member[];
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function remove(userId: string) {
    setBusy(userId);
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);
    setBusy(null);
    setConfirming(null);
    if (error) {
      setErr(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="members-manager">
      {members.map((m) => {
        const isOwner = m.role === "owner" || m.id === ownerId;
        return (
          <div className="member-row" key={m.id}>
            <Avatar name={m.name} url={m.avatar} />
            <span className="member-name">
              {m.name}
              {isOwner && <span className="member-owner-tag">Owner</span>}
            </span>
            {!isOwner &&
              (confirming === m.id ? (
                <span className="member-confirm">
                  <button
                    type="button"
                    className="member-remove danger"
                    onClick={() => remove(m.id)}
                    disabled={busy === m.id}
                  >
                    {busy === m.id ? "…" : "Remove"}
                  </button>
                  <button
                    type="button"
                    className="member-cancel"
                    onClick={() => setConfirming(null)}
                    disabled={busy === m.id}
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="member-remove"
                  onClick={() => setConfirming(m.id)}
                >
                  Remove
                </button>
              ))}
          </div>
        );
      })}
      {members.length === 0 && (
        <p className="settings-hint dim">No members yet.</p>
      )}
      {err && <p className="auth-error">{err}</p>}
    </div>
  );
}
