"use client";

import { useEffect, useRef, useState } from "react";

function mmss(d: number) {
  const m = Math.floor(d / 60);
  const s = Math.floor(d % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VoiceNote({
  src,
  transcript,
  duration,
}: {
  src: string;
  transcript: string | null;
  duration?: number | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [showText, setShowText] = useState(false);
  const [ready, setReady] = useState(false);
  const [dur, setDur] = useState<string | null>(
    duration && duration > 0 ? mmss(duration) : null,
  );
  const objRef = useRef<string | null>(null);

  // iOS won't reliably play a remote signed URL, but it always plays a local
  // object URL (that's why the record preview works). So fetch the file into a
  // blob and point the player at that.
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    fetch(src)
      .then((r) => r.blob())
      .then((b) => {
        if (cancelled) return;
        const url = URL.createObjectURL(b);
        objRef.current = url;
        if (audioRef.current) audioRef.current.src = url;
        setReady(true);
      })
      .catch(() => {
        // Fall back to streaming the remote URL directly.
        if (cancelled) return;
        if (audioRef.current) audioRef.current.src = src;
        setReady(true);
      });
    return () => {
      cancelled = true;
      if (objRef.current) {
        URL.revokeObjectURL(objRef.current);
        objRef.current = null;
      }
    };
  }, [src]);

  function onMeta() {
    if (dur) return;
    const d = audioRef.current?.duration;
    if (d && isFinite(d) && d > 0) setDur(mmss(d));
  }

  function toggle() {
    const a = audioRef.current;
    if (!a || !ready) return;
    if (playing) a.pause();
    else a.play().catch(() => {});
  }

  return (
    <div className="voice-note">
      <div className="voice-row">
        <button className="voice-play" onClick={toggle} disabled={!ready}>
          <span className="voice-ic">{playing ? "⏸" : "▶"}</span>
          {playing ? "Playing…" : ready ? "Listen" : "Loading…"}
          {dur && !playing && <span className="voice-dur">{dur}</span>}
        </button>
        {transcript && (
          <button
            className="voice-transcript-toggle"
            onClick={() => setShowText((s) => !s)}
          >
            {showText ? "Hide text" : "Read transcription"}
          </button>
        )}
      </div>
      {showText && transcript && (
        <p className="voice-transcript">{transcript}</p>
      )}
      <audio
        ref={audioRef}
        preload="none"
        onLoadedMetadata={onMeta}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}
