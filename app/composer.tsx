"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Activity } from "@/lib/types";

function pickAudioMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm", "audio/mp4", "audio/ogg"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export default function Composer({
  activities,
  groupId,
  userId,
  postedToday,
}: {
  activities: Activity[];
  groupId: string;
  userId: string;
  postedToday: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Photo
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Voice
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setPhoto(f);
    setPhotoPreview(f ? URL.createObjectURL(f) : null);
  }

  function clearPhoto() {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickAudioMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mime || "audio/webm",
        });
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

  async function post() {
    if (selected.size === 0 && !caption.trim() && !photo && !audioBlob) {
      setError("Tap what you did, add a note, photo, or voice.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();

    const { data: created, error: postError } = await supabase
      .from("group_posts")
      .insert({
        group_id: groupId,
        author_id: userId,
        caption: caption.trim() || null,
      })
      .select("id")
      .single();

    if (postError || !created) {
      setError(postError?.message ?? "Could not post.");
      setBusy(false);
      return;
    }
    const postId = created.id as string;

    if (selected.size > 0) {
      const { error: linkError } = await supabase.from("post_activities").insert(
        [...selected].map((activity_id) => ({ post_id: postId, activity_id })),
      );
      if (linkError) return fail(linkError.message);
    }

    if (photo) {
      const ext = photo.name.split(".").pop() || "jpg";
      const path = `${userId}/${postId}-photo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, photo, { contentType: photo.type });
      if (upErr) return fail(upErr.message);
      const { error: mErr } = await supabase.from("media").insert({
        owner_id: userId,
        type: "image",
        storage_path: path,
        post_id: postId,
      });
      if (mErr) return fail(mErr.message);
    }

    if (audioBlob) {
      const path = `${userId}/${postId}-voice.webm`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, audioBlob, { contentType: audioBlob.type });
      if (upErr) return fail(upErr.message);
      const { error: mErr } = await supabase.from("media").insert({
        owner_id: userId,
        type: "audio",
        storage_path: path,
        post_id: postId,
      });
      if (mErr) return fail(mErr.message);
    }

    // Reset
    setSelected(new Set());
    setCaption("");
    clearPhoto();
    clearAudio();
    setOpen(false);
    setBusy(false);
    router.refresh();

    function fail(msg: string) {
      setError(msg);
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="post-cta" onClick={() => setOpen(true)}>
        {postedToday ? "Update again" : "Log today ›"}
      </button>
    );
  }

  return (
    <div className="composer">
      <p className="composer-label">How&apos;d today go?</p>
      <div className="toggle-grid">
        {activities.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`toggle ${selected.has(a.id) ? "on" : ""}`}
            onClick={() => toggle(a.id)}
          >
            <span className="toggle-emoji">{a.emoji ?? "✅"}</span>
            {a.name}
          </button>
        ))}
      </div>

      {/* Context — caption, voice, photo all live together, all optional */}
      <div className={`context-box ${recording ? "is-recording" : ""}`}>
        <textarea
          className="context-input"
          placeholder="Add a caption or note…"
          rows={2}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />

        {photoPreview && (
          <div className="media-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoPreview} alt="preview" />
            <button type="button" className="remove" onClick={clearPhoto}>
              ✕
            </button>
          </div>
        )}

        {audioPreview && (
          <div className="media-preview audio">
            <audio controls src={audioPreview} />
            <button type="button" className="remove" onClick={clearAudio}>
              ✕
            </button>
          </div>
        )}

        <div className="context-toolbar">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={onPhoto}
          />
          <button
            type="button"
            className="icon-btn"
            onClick={() => fileInput.current?.click()}
            aria-label="Add photo"
          >
            📷
          </button>
          {recording ? (
            <button
              type="button"
              className="icon-btn recording"
              onClick={stopRecording}
              aria-label="Stop recording"
            >
              ● Stop
            </button>
          ) : (
            <button
              type="button"
              className="icon-btn"
              onClick={startRecording}
              aria-label="Record voice note"
            >
              🎙️
            </button>
          )}
          <span className="context-hint">optional context</span>
        </div>
      </div>

      {error && <p className="auth-error">{error}</p>}

      <div className="composer-actions">
        <button type="button" className="ghost" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </button>
        <button type="button" onClick={post} disabled={busy}>
          {busy ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}
