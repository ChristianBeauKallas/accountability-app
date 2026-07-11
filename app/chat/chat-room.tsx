"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/types";

type Member = { name: string; avatar: string | null };

function MsgAvatar({ name, url }: { name?: string; url?: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="msg-avatar-img" src={url} alt={name ?? ""} />;
  }
  return (
    <span className="msg-avatar-img fallback">
      {(name ?? "?").trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export default function ChatRoom({
  groupId,
  userId,
  initial,
  members,
}: {
  groupId: string;
  userId: string;
  initial: Message[];
  members: Record<string, Member>;
}) {
  const [messages, setMessages] = useState<Message[]>(initial);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Live updates.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  // Auto-scroll on new messages.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("messages")
      .insert({ group_id: groupId, author_id: userId, body: text })
      .select("id, group_id, author_id, body, created_at")
      .single();
    setSending(false);
    if (error || !data) {
      setError(error?.message ?? "Couldn't send that — try again.");
      return;
    }
    setBody("");
    // Show it immediately; realtime dedup below prevents a double.
    setMessages((prev) =>
      prev.some((m) => m.id === data.id) ? prev : [...prev, data as Message],
    );
  }

  return (
    <div className="chat-room">
      <div className="chat-scroll">
        {messages.length === 0 && (
          <p className="empty chat-empty">
            No messages yet. Say hey 👋 — this is the space for banter, ideas, and
            jokes.
          </p>
        )}
        {messages.map((m, i) => {
          const mine = m.author_id === userId;
          const author = members[m.author_id];
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const showAuthor = !mine && (!prev || prev.author_id !== m.author_id);
          // Avatar sits on the last message of a consecutive run.
          const showAvatar =
            !mine && (!next || next.author_id !== m.author_id);
          return (
            <div key={m.id} className={`msg-row ${mine ? "mine" : ""}`}>
              {!mine && (
                <span className="msg-avatar">
                  {showAvatar && <MsgAvatar name={author?.name} url={author?.avatar} />}
                </span>
              )}
              <div className="msg-content">
                {showAuthor && (
                  <span className="msg-author">{author?.name ?? "Someone"}</span>
                )}
                <div className="msg-bubble">{m.body}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <p className="chat-error">{error}</p>}

      <form className="chat-input" onSubmit={send}>
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Message…"
          aria-label="Message"
        />
        <button type="submit" disabled={sending || !body.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
