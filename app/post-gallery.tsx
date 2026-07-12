"use client";

import { useRef, useState } from "react";

export default function PostGallery({ photos }: { photos: string[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  if (photos.length === 0) return null;

  function onScroll() {
    const el = track.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setIdx(Math.max(0, Math.min(photos.length - 1, i)));
  }

  return (
    <>
      <div className="pg">
        <div className="pg-track" ref={track} onScroll={onScroll}>
          {photos.map((src, i) => (
            <button
              type="button"
              className="pg-item"
              key={i}
              onClick={() => setOpen(src)}
              aria-label="View photo"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="pg-photo" src={src} alt="" />
            </button>
          ))}
        </div>
        {photos.length > 1 && (
          <div className="pg-dots">
            {photos.map((_, i) => (
              <span key={i} className={`pg-dot ${i === idx ? "on" : ""}`} />
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="lightbox" onClick={() => setOpen(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={open} alt="" />
          <button className="lightbox-close" aria-label="Close">
            ✕
          </button>
        </div>
      )}
    </>
  );
}
