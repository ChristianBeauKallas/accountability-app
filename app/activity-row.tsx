"use client";

import { useState } from "react";

export default function ActivityRow({
  items,
  total,
}: {
  items: { emoji: string; name: string }[];
  total: number;
}) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  const complete = total > 0 && items.length >= total;
  const denom = Math.max(total, items.length);

  return (
    <div className="activity-summary">
      <button
        type="button"
        className={`activity-pill ${complete ? "complete" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="ap-check">✓</span>
        <span className="ap-frac">
          {items.length}/{denom}
        </span>
        <span className="ap-word">done</span>
        <span className="ap-chev">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="activity-tags">
          {items.map((a, i) => (
            <span className="activity-tag" key={i}>
              {a.emoji} {a.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
