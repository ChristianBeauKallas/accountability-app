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
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}
