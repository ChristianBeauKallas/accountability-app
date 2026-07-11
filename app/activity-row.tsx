"use client";

import { useState } from "react";

export default function ActivityRow({
  items,
}: {
  items: { emoji: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  return (
    <button
      className="activity-row"
      onClick={() => setOpen((o) => !o)}
      aria-label="Completed activities"
    >
      <span className="activity-emojis">
        {items.map((a, i) => (
          <span key={i}>{a.emoji}</span>
        ))}
      </span>
      {open ? (
        <span className="activity-names">
          {items.map((a) => a.name).join(" · ")}
        </span>
      ) : (
        <span className="activity-count">{items.length} done</span>
      )}
    </button>
  );
}
