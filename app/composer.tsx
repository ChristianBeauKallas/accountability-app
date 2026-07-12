"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { notify } from "@/lib/push";
import { transcribe, polish } from "@/lib/ai";
import type { Activity } from "@/lib/types";

function pickAudioMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const c = ["audio/webm", "audio/mp4", "audio/ogg"];
  return c.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

type Step = "activities" | "context" | "caption" | "photos";

export default function Composer({
  activities,
  groupId,
  userId,
  done,
  remainingCount,
}: {
  activities: Activity[];
  groupId: string;
  userId: string;
  done: boolean;
  remainingCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("activities");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [typing, setTyping] = useState(false);
  const [caption, setCaption] = useState("");
  const [attachAudio, setAttachAudio] = useState(true);

  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recStartRef = useRef(0);
  const chunksRef = useRef<Blob[]>([]);

  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const [working, setWorking] = useState(false); // transcribe/polish/post
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStep("activities");
    setSelected(new Set());
    setTyping(false);
    setCaption("");
    setAttachAudio(true);
    setAudioBlob(null);
    setAudioUrl(null);
    setAudioDuration(0);
    setPhotos([]);
    setPreviews([]);
    setError(null);
    setOpen(false);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  // ---- Recording ----
  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickAudioMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setAudioDuration(Math.round((Date.now() - recStartRef.current) / 1000));
        setAttachAudio(true);
        stream.getTracks().forEach((t) => t.stop());
        setStep("caption");
        processDictation(blob);
      };
      recorderRef.current = rec;
      rec.start();
      recStartRef.current = Date.now();
      setRecording(true);
    } catch {
      setError("Microphone access denied — you can type instead.");
      setTyping(true);
    }
  }
  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  // ---- After dictation: auto transcribe + clean into an editable caption ----
  async function processDictation(blob: Blob) {
    setWorking(true);
    setError(null);
    try {
      const raw = await transcribe(blob);
      let text = raw;
      try {
        text = await polish(raw);
      } catch {
        /* if cleanup fails, keep the raw transcript */
      }
      setCaption(text);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Couldn't transcribe — type your note instead.",
      );
    }
    setWorking(false);
  }

  async function doPolish() {
    if (!caption.trim()) return;
    setWorking(true);
    setCaption(await polish(caption));
    setWorking(false);
  }

  // ---- Photos ----
  function onPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setPhotos((p) => [...p, ...files]);
    setPreviews((p) => [...p, ...files.map((f) => URL.createObjectURL(f))]);
    if (fileInput.current) fileInput.current.value = "";
  }
  function removePhoto(i: number) {
    setPhotos((p) => p.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
  }

  // ---- Post ----
  async function post() {
    const hasCaption = caption.trim().length > 0;
    const hasAudio = attachAudio && !!audioBlob;
    if (selected.size === 0 && !hasCaption && !hasAudio && photos.length === 0) {
      setError("Add at least one activity, a note, a voice note, or a photo.");
      return;
    }
    setWorking(true);
    setError(null);
    const supabase = createClient();

    const { data: created, error: postErr } = await supabase
      .from("group_posts")
      .insert({
        group_id: groupId,
        author_id: userId,
        caption: hasCaption ? caption.trim() : null,
      })
      .select("id")
      .single();
    if (postErr || !created) return fail(postErr?.message ?? "Could not post.");
    const postId = created.id as string;

    if (selected.size > 0) {
      const { error } = await supabase
        .from("post_activities")
        .insert([...selected].map((activity_id) => ({ post_id: postId, activity_id })));
      if (error) return fail(error.message);
    }

    // Voice note (optional — the caption is the readable version)
    if (hasAudio && audioBlob) {
      const path = `${userId}/${postId}-voice.webm`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, audioBlob, { contentType: audioBlob.type });
      if (upErr) return fail(upErr.message);
      const { data: m, error: mErr } = await supabase
        .from("media")
        .insert({ owner_id: userId, type: "audio", storage_path: path, post_id: postId })
        .select("id")
        .single();
      if (mErr) return fail(mErr.message);
      // Store the recorded length so the feed can show it (iOS won't preload
      // audio metadata). Best-effort; ignore if the column isn't there yet.
      if (audioDuration && m) {
        await supabase
          .from("media")
          .update({ duration_seconds: audioDuration })
          .eq("id", m.id);
      }
      // Store the caption as the transcript too, so a voice-only post is still
      // readable. Best-effort; ignore if the column isn't there yet.
      if (hasCaption && m) {
        await supabase
          .from("media")
          .update({ transcript: caption.trim() })
          .eq("id", m.id);
      }
    }

    // Photos
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const ext = photo.name.split(".").pop() || "jpg";
      const path = `${userId}/${postId}-photo-${i}.${ext}`;
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

    notify("post", postId);
    setWorking(false);
    reset();
    router.refresh();

    function fail(msg: string) {
      setError(msg);
      setWorking(false);
    }
  }

  // ---- Render ----
  if (!open) {
    if (done) {
      return (
        <div className="fab done" aria-label="All logged for today">
          <span className="fab-plus">✓</span>
        </div>
      );
    }
    return (
      <button
        className="fab"
        onClick={() => setOpen(true)}
        aria-label="Log today"
      >
        <span className="fab-plus">＋</span>
        {remainingCount > 0 && (
          <span className="fab-badge">{remainingCount}</span>
        )}
      </button>
    );
  }

  const stepNum = { activities: 1, context: 2, caption: 2, photos: 3 }[step];
  const selectedActivities = activities.filter((a) => selected.has(a.id));

  return (
    <>
      <div className="sheet-backdrop" onClick={reset} />
      <div className="composer composer-sheet">
      <div className="wizard-top">
        <div className="wizard-dots">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`dot ${n <= stepNum ? "on" : ""}`} />
          ))}
        </div>
        <button className="wizard-close" onClick={reset} aria-label="Close">
          ✕
        </button>
      </div>

      {/* STEP 1 — activities */}
      {step === "activities" && (
        <>
          <p className="composer-label">What&apos;d you get done today?</p>
          <div className="toggle-grid">
            {activities.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`toggle ${selected.has(a.id) ? "on" : ""}`}
                onClick={() => toggle(a.id)}
              >
                <span className="toggle-emoji">{a.emoji ?? "✅"}</span>
                <span className="toggle-text">
                  <span className="toggle-name">{a.name}</span>
                  {a.description && (
                    <span className="toggle-desc">{a.description}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
          <div className="wizard-actions">
            <button className="wizard-next" onClick={() => setStep("context")}>
              Next ›
            </button>
          </div>
        </>
      )}

      {/* STEP 2 — what did you do (dictate or type) */}
      {step === "context" && (
        <>
          <p className="composer-label">What did you do?</p>
          <p className="composer-sub">
            {selectedActivities.length > 0
              ? "Talk through each one:"
              : "Let the group know what you did."}
          </p>
          {selectedActivities.length > 0 && (
            <ul className="dictate-prompts">
              {selectedActivities.map((a) => (
                <li key={a.id}>
                  <span className="dp-emoji">{a.emoji ?? "✅"}</span>
                  <span>
                    {a.prompt?.trim() || `What did you do for ${a.name}?`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {!typing ? (
            <div className="dictate-wrap">
              {!recording ? (
                <button className="dictate-btn" onClick={startRecording}>
                  🎙️ <span>Dictate</span>
                </button>
              ) : (
                <button className="dictate-btn recording" onClick={stopRecording}>
                  ● <span>Stop</span>
                </button>
              )}
              <button className="link-btn" onClick={() => setTyping(true)}>
                prefer to type?
              </button>
              <button
                className="link-btn skip"
                onClick={() => setStep("photos")}
              >
                skip
              </button>
            </div>
          ) : (
            <>
              <textarea
                className="context-input typed"
                placeholder="Write a quick note…"
                rows={3}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                autoFocus
              />
              <div className="wizard-actions">
                <button className="link-btn" onClick={() => setTyping(false)}>
                  ‹ dictate instead
                </button>
                <button
                  className="wizard-next"
                  onClick={() => setStep("photos")}
                >
                  Next ›
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* STEP 2b — review the auto-generated caption + optional voice note */}
      {step === "caption" && (
        <>
          <p className="composer-label">What did you do?</p>
          <p className="composer-sub">
            {working ? "Writing it up…" : "Edit the text if you need to."}
          </p>
          <textarea
            className="context-input typed"
            rows={4}
            value={caption}
            placeholder={working ? "Transcribing…" : "Your note…"}
            onChange={(e) => setCaption(e.target.value)}
          />
          {audioUrl && (
            <div className="voice-attach">
              <audio className="post-audio" controls src={audioUrl} />
              <label className="attach-toggle">
                <input
                  type="checkbox"
                  checked={attachAudio}
                  onChange={(e) => setAttachAudio(e.target.checked)}
                />
                <span>Attach the voice recording</span>
              </label>
            </div>
          )}
          <div className="wizard-actions">
            <button
              className="polish-btn"
              onClick={doPolish}
              disabled={working || !caption.trim()}
            >
              {working ? "Working…" : "✨ Clean up"}
            </button>
            <button className="wizard-next" onClick={() => setStep("photos")}>
              Next ›
            </button>
          </div>
        </>
      )}

      {/* STEP 3 — photos */}
      {step === "photos" && (
        <>
          <p className="composer-label">Add a photo? (optional)</p>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={onPhotos}
          />
          {previews.length > 0 && (
            <div className="photo-grid">
              {previews.map((src, i) => (
                <div className="photo-thumb" key={i}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" />
                  <button className="remove" onClick={() => removePhoto(i)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <button className="add-photo-btn" onClick={() => fileInput.current?.click()}>
            📷 {previews.length > 0 ? "Add more" : "Add photo(s)"}
          </button>
          <div className="wizard-actions">
            <button className="wizard-post" onClick={post} disabled={working}>
              {working ? "Posting…" : "Post"}
            </button>
          </div>
        </>
      )}

        {error && <p className="auth-error">{error}</p>}
      </div>
    </>
  );
}
