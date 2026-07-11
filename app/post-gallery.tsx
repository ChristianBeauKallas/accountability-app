"use client";

import { useState } from "react";

export default function PostGallery({ photos }: { photos: string[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (photos.length === 0) return null;

  return (
    <>
      <div className={`post-gallery ${photos.length > 1 ? "multi" : ""}`}>
        {photos.map((src, i) => (
          <button
            type="button"
            className="gallery-item"
            key={i}
            onClick={() => setOpen(src)}
            aria-label="View photo"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="gallery-photo" src={src} alt="" />
          </button>
        ))}
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
