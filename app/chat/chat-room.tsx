"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { notify } from "@/lib/push";
import type { Message } from "@/lib/types";

type Member = { name: string; avatar: string | null };

function pickAudioMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const c = ["audio/webm", "audio/mp4", "audio/ogg"];
  return c.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

function chatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

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
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Message | null>(null);
  const requestedRef = useRef<Set<string>>(new Set());
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Pending attachments
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        (payload) => {
          // DELETE payloads carry only the primary key, so we can't filter by
          // group server-side — just drop it if it's one we're showing.
          const old = payload.old as { id?: string };
          if (old.id)
            setMessages((prev) => prev.filter((m) => m.id !== old.id));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  // Sign media URLs for any new attachments.
  useEffect(() => {
    const paths = messages
      .flatMap((m) => [m.image_path, m.audio_path])
      .filter((p): p is string => !!p)
      .filter((p) => !requestedRef.current.has(p));
    if (paths.length === 0) return;
    paths.forEach((p) => requestedRef.current.add(p));
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.storage
        .from("media")
        .createSignedUrls(paths, 60 * 60);
      const next: Record<string, string> = {};
      for (const s of data ?? [])
        if (s.signedUrl && s.path) next[s.path] = s.signedUrl;
      setSigned((prev) => ({ ...prev, ...next }));
    })();
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setImageFile(f);
    setImagePreview(f ? URL.createObjectURL(f) : null);
    if (fileInput.current) fileInput.current.value = "";
  }
  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickAudioMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => ev.data.size > 0 && chunksRef.current.push(ev.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
        setAudioBlob(blob);
        setAudioPreview(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setError("Microphone access denied.");
    }
  }
  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }
  function clearAudio() {
    setAudioBlob(null);
    setAudioPreview(null);
  }

  // Long-press one of your own messages to delete it.
  function startPress(m: Message) {
    clearPress();
    pressTimer.current = setTimeout(() => setConfirmDelete(m), 500);
  }
  function clearPress() {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }
  async function deleteMessage(id: string) {
    setConfirmDelete(null);
    setMessages((prev) => prev.filter((m) => m.id !== id));
    const supabase = createClient();
    await supabase.from("messages").delete().eq("id", id);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text && !imageFile && !audioBlob) return;
    setSending(true);
    setError(null);
    const supabase = createClient();

    let image_path: string | null = null;
    let audio_path: string | null = null;
    try {
      if (imageFile) {
        const ext = imageFile.name.split(".").pop() || "jpg";
        const path = `${userId}/chat-${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("media")
          .upload(path, imageFile, { contentType: imageFile.type });
        if (error) throw error;
        image_path = path;
      }
      if (audioBlob) {
        const path = `${userId}/chat-${crypto.randomUUID()}.webm`;
        const { error } = await supabase.storage
          .from("media")
          .upload(path, audioBlob, { contentType: audioBlob.type });
        if (error) throw error;
        audio_path = path;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setSending(false);
      return;
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({ group_id: groupId, author_id: userId, body: text, image_path, audio_path })
      .select("*")
      .single();
    setSending(false);
    if (error || !data) {
      setError(error?.message ?? "Couldn't send that — try again.");
      return;
    }
    setBody("");
    clearImage();
    clearAudio();
    notify("message", data.id);
    setMessages((prev) =>
      prev.some((m) => m.id === data.id) ? prev : [...prev, data as Message],
    );
  }

  const canSend = !!(body.trim() || imageFile || audioBlob);

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
          const first = !prev || prev.author_id !== m.author_id;
          const showAvatar = !mine && (!next || next.author_id !== m.author_id);
          const img = m.image_path ? signed[m.image_path] : null;
          const aud = m.audio_path ? signed[m.audio_path] : null;
          return (
            <div key={m.id} className={`msg-row ${mine ? "mine" : ""}`}>
              {!mine && (
                <span className="msg-avatar">
                  {showAvatar && (
                    <MsgAvatar name={author?.name} url={author?.avatar} />
                  )}
                </span>
              )}
              <div
                className="msg-content"
                onTouchStart={mine ? () => startPress(m) : undefined}
                onTouchEnd={mine ? clearPress : undefined}
                onTouchMove={mine ? clearPress : undefined}
                onContextMenu={
                  mine
                    ? (e) => {
                        e.preventDefault();
                        setConfirmDelete(m);
                      }
                    : undefined
                }
              >
                {first && !mine && (
                  <span className="msg-author">
                    {author?.name ?? "Someone"}{" "}
                    <span className="msg-time">{chatTime(m.created_at)}</span>
                  </span>
                )}
                {first && mine && (
                  <span className="msg-time-own">{chatTime(m.created_at)}</span>
                )}
                {img && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="msg-image"
                    src={img}
                    alt=""
                    onClick={() => setLightbox(img)}
                  />
                )}
                {aud && <audio className="msg-audio" controls src={aud} />}
                {m.body && <div className="msg-bubble">{m.body}</div>}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <p className="chat-error">{error}</p>}

      <form className="chat-input" onSubmit={send}>
        {(imagePreview || audioPreview) && (
          <div className="chat-pending">
            {imagePreview && (
              <div className="chat-pending-item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="" />
                <button type="button" onClick={clearImage}>
                  ✕
                </button>
              </div>
            )}
            {audioPreview && (
              <div className="chat-pending-item audio">
                <audio controls src={audioPreview} />
                <button type="button" onClick={clearAudio}>
                  ✕
                </button>
              </div>
            )}
          </div>
        )}
        <div className="chat-input-row">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={onImage}
          />
          <button
            type="button"
            className="chat-attach"
            onClick={() => fileInput.current?.click()}
            aria-label="Add photo"
          >
            📷
          </button>
          {recording ? (
            <button
              type="button"
              className="chat-attach rec"
              onClick={stopRecording}
              aria-label="Stop recording"
            >
              ●
            </button>
          ) : (
            <button
              type="button"
              className="chat-attach"
              onClick={startRecording}
              aria-label="Record voice note"
            >
              🎙️
            </button>
          )}
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message…"
            aria-label="Message"
          />
          <button type="submit" disabled={sending || !canSend}>
            Send
          </button>
        </div>
      </form>

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" />
          <button className="lightbox-close" aria-label="Close">
            ✕
          </button>
        </div>
      )}

      {confirmDelete &&
        createPortal(
          <div
            className="tour-overlay"
            role="dialog"
            aria-modal="true"
            onClick={() => setConfirmDelete(null)}
          >
            <div
              className="tour-card pm-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="tour-icon">🗑️</div>
              <h2 className="tour-title">Delete message?</h2>
              {confirmDelete.body && (
                <p className="tour-body">“{confirmDelete.body}”</p>
              )}
              <div className="tour-nav">
                <button
                  type="button"
                  className="tour-back"
                  onClick={() => setConfirmDelete(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="pm-delete"
                  onClick={() => deleteMessage(confirmDelete.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
