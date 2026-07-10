"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      author_id: userId,
      body: text,
    });
    setBusy(false);
    if (!error) {
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
