"use client";

import { useRef, useState } from "react";

export default function VoiceNote({
  src,
  transcript,
}: {
  src: string;
  transcript: string | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [showText, setShowText] = useState(false);
  const [dur, setDur] = useState<string | null>(null);

  function fmt(d: number) {
    if (!isFinite(d) || d <= 0) return;
    const m = Math.floor(d / 60);
    const s = Math.floor(d % 60);
    setDur(`${m}:${s.toString().padStart(2, "0")}`);
  }

  function onMeta() {
    const a = audioRef.current;
    if (!a) return;
    // MediaRecorder webm often reports Infinity until you seek — nudge it once.
    if (a.duration === Infinity) {
      a.currentTime = 1e101;
      a.addEventListener(
        "timeupdate",
        function once() {
          a.removeEventListener("timeupdate", once);
          a.currentTime = 0;
          fmt(a.duration);
        },
        { once: true },
      );
    } else {
      fmt(a.duration);
    }
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
