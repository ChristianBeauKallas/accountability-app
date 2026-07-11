"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { notify } from "@/lib/push";

export default function CommentBox({
  postId,
  userId,
}: {
  postId: string;
  userId: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: postId, author_id: userId, body: text })
      .select("id")
      .single();
    setBusy(false);
    if (!error && data) {
      notify("comment", data.id);
      setBody("");
      router.refresh();
    }
  }

  return (
    <form className="comment-box" onSubmit={send}>
      <input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a comment…"
        aria-label="Add a comment"
      />
      <button type="submit" disabled={busy || !body.trim()}>
        Send
      </button>
    </form>
  );
}
