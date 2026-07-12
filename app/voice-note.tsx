"use client";

import { useRef, useState } from "react";

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
  // Prefer the length stored at record time; fall back to reading the file.
  const [dur, setDur] = useState<string | null>(
    duration && duration > 0 ? mmss(duration) : null,
  );

  function onMeta() {
    if (dur) return; // already have the stored length
    const d = audioRef.current?.duration;
    if (d && isFinite(d) && d > 0) setDur(mmss(d));
  }

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause();
    else a.play();
  }

  return (
    <div className="voice-note">
      <div className="voice-row">
        <button className="voice-play" onClick={toggle}>
          <span className="voice-ic">{playing ? "⏸" : "▶"}</span>
          {playing ? "Playing…" : "Listen"}
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
        src={src}
        preload="metadata"
        onLoadedMetadata={onMeta}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}
